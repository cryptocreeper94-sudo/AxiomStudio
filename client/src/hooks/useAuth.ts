/**
 * Axiom Studio — Auth Hook
 * Unified auth: Firebase (Google/GitHub) + legacy username/password.
 * 30-day persistent sessions with optional WebAuthn biometrics.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useEffect, useCallback } from "react";
import {
  auth,
  signInWithGoogle,
  signInWithGitHub,
  getFirebaseIdToken,
  firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "../lib/firebase";

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role?: string;
  photoURL?: string;
  authMethod?: "firebase" | "legacy";
}

interface AuthState {
  token: string | null;
  userId: string | null;
  user: AuthUser | null;
  login: (email: string, password: string, remember?: boolean) => Promise<string | null>;
  signup: (email: string, password: string, displayName: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<string | null>;
  loginWithGitHub: () => Promise<string | null>;
  logout: () => void;
  biometricsAvailable: boolean;
  biometricsEnrolled: boolean;
  enrollBiometrics: () => Promise<string | null>;
  loginWithBiometrics: () => Promise<string | null>;
}

const STORAGE_KEY = "axiom_token";
const USER_KEY = "axiom_user";
const EXPIRY_KEY = "axiom_token_expiry";
const BIO_CRED_KEY = "axiom_bio_cred";
const SSO_KEY = "tl-sso-token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isTokenExpired(): boolean {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() > parseInt(expiry, 10);
}

function setTokenWithExpiry(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + THIRTY_DAYS_MS));
}

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && !isTokenExpired() ? saved : null;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch {}
    }
    return null;
  });
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnrolled, setBiometricsEnrolled] = useState(false);

  // Check for biometric support
  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then(avail => setBiometricsAvailable(avail))
        .catch(() => setBiometricsAvailable(false));
    }
    setBiometricsEnrolled(!!localStorage.getItem(BIO_CRED_KEY));
  }, []);

  // Restore session on mount — only use Axiom's own token, never the SSO token
  // (tl-sso-token is signed by Trust Layer with a different secret/payload and will fail jwt.verify here)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (saved && !isTokenExpired()) {
      setToken(saved);
      if (savedUser) try { setUser(JSON.parse(savedUser)); } catch {}
    } else if (saved) {
      // Token expired — clear it
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    }
  }, []);

  // ── Mobile App Bridge: auto-authenticate when loaded inside the native APK ──
  useEffect(() => {
    const w = window as any;
    const doMobileAuth = async (firebaseIdToken: string) => {
      try {
        const res = await fetch("/api/agent/auth/firebase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: firebaseIdToken }),
        });
        const data = await res.json();
        if (data.success && data.user && w.__AXIOM_USER__) {
          data.user.photoURL = w.__AXIOM_USER__.photoURL;
          data.user.authMethod = "firebase";
        }
        handleAuthResponse(data, true);
      } catch (err) {
        console.error("[Auth] Mobile bridge auth failed:", err);
      }
    };

    // Check if launched from the native APK with a pre-injected token
    if (w.__AXIOM_MOBILE__ && w.__AXIOM_FIREBASE_TOKEN__ && !token) {
      doMobileAuth(w.__AXIOM_FIREBASE_TOKEN__);
    }

    // Also listen for the custom event (fired after WebView load)
    const handler = (e: any) => {
      if (e.detail?.token) doMobileAuth(e.detail.token);
    };
    window.addEventListener("axiom-mobile-auth", handler);
    return () => window.removeEventListener("axiom-mobile-auth", handler);
  }, [handleAuthResponse, token]);

  // ── Common response handler ──
  const handleAuthResponse = useCallback((data: any, persist = true) => {
    if (data.success && data.token) {
      setToken(data.token);
      setUser(data.user);
      if (persist) {
        setTokenWithExpiry(data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } else {
        sessionStorage.setItem(STORAGE_KEY, data.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return null;
    }
    return data.error || "Authentication failed";
  }, []);

  // ── Legacy username/password login ──
  const login = useCallback(async (email: string, password: string, remember = true): Promise<string | null> => {
    try {
      const res = await fetch("/api/agent/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return handleAuthResponse(data, remember);
    } catch (err: any) {
      return err.message || "Network error";
    }
  }, [handleAuthResponse]);

  // ── Legacy signup ──
  const signup = useCallback(async (email: string, password: string, displayName: string): Promise<string | null> => {
    try {
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
      const res = await fetch("/api/agent/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, displayName }),
      });
      const data = await res.json();
      return handleAuthResponse(data, true);
    } catch (err: any) {
      return err.message || "Network error";
    }
  }, [handleAuthResponse]);

  const exchangeFirebaseToken = useCallback(async (firebaseUser: FirebaseUser): Promise<string | null> => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch("/api/agent/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        data.user.photoURL = firebaseUser.photoURL;
        data.user.authMethod = "firebase";
      }
      if (!res.ok) {
        console.error("[Auth] Firebase exchange failed:", data);
      }
      return handleAuthResponse(data, true);
    } catch (err: any) {
      console.error("[Auth] Firebase token exchange error:", err);
      return err.message || "Firebase authentication failed";
    }
  }, [handleAuthResponse]);

  // ── Google Sign-In ──
  const loginWithGoogle = useCallback(async (): Promise<string | null> => {
    try {
      const firebaseUser = await signInWithGoogle();
      return await exchangeFirebaseToken(firebaseUser);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") return "Sign-in cancelled";
      if (err.code === "auth/account-exists-with-different-credential") {
        return "An account already exists with this email using a different sign-in method";
      }
      console.error("[Auth] Google sign-in error:", err);
      return err.message || "Google sign-in failed";
    }
  }, [exchangeFirebaseToken]);

  // ── GitHub Sign-In ──
  const loginWithGitHub = useCallback(async (): Promise<string | null> => {
    try {
      const firebaseUser = await signInWithGitHub();
      return await exchangeFirebaseToken(firebaseUser);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") return "Sign-in cancelled";
      if (err.code === "auth/account-exists-with-different-credential") {
        return "An account already exists with this email using a different sign-in method";
      }
      console.error("[Auth] GitHub sign-in error:", err);
      return err.message || "GitHub sign-in failed";
    }
  }, [exchangeFirebaseToken]);

  // ── Logout ──
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(USER_KEY);
    // Also sign out of Firebase
    firebaseSignOut().catch(() => {});
  }, []);

  // ── WebAuthn Biometrics ──

  const enrollBiometrics = useCallback(async (): Promise<string | null> => {
    if (!user || !token) return "Must be logged in to enroll biometrics";
    if (!window.PublicKeyCredential) return "Biometrics not supported on this device";

    try {
      const userId = new TextEncoder().encode(user.id);
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const credential = await navigator.credentials.create({
        publicKey: {
          rp: { name: "Axiom Studio", id: window.location.hostname },
          user: {
            id: userId,
            name: user.username,
            displayName: user.displayName || user.username,
          },
          challenge,
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        },
      }) as PublicKeyCredential;

      if (credential) {
        const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        localStorage.setItem(BIO_CRED_KEY, JSON.stringify({
          credId,
          username: user.username,
          userId: user.id,
          enrolledAt: Date.now(),
        }));
        setBiometricsEnrolled(true);
        return null;
      }
      return "Biometric enrollment failed";
    } catch (err: any) {
      return err.message || "Biometric enrollment failed";
    }
  }, [user, token]);

  const loginWithBiometrics = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem(BIO_CRED_KEY);
    if (!stored) return "No biometric credential enrolled";

    try {
      const { credId, username } = JSON.parse(stored);
      const credIdBuffer = Uint8Array.from(atob(credId), c => c.charCodeAt(0));
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{ id: credIdBuffer, type: "public-key", transports: ["internal"] }],
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (assertion) {
        const savedToken = localStorage.getItem(STORAGE_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken && !isTokenExpired()) {
          setToken(savedToken);
          if (savedUser) try { setUser(JSON.parse(savedUser)); } catch {}
          return null;
        }

        return "Session expired. Please log in with your password to re-authenticate.";
      }
      return "Biometric verification failed";
    } catch (err: any) {
      if (err.name === "NotAllowedError") return "Biometric verification cancelled";
      return err.message || "Biometric login failed";
    }
  }, []);

  const userId = user?.id || null;

  return {
    token, userId, user, login, signup, loginWithGoogle, loginWithGitHub, logout,
    biometricsAvailable, biometricsEnrolled,
    enrollBiometrics, loginWithBiometrics,
  };
}
