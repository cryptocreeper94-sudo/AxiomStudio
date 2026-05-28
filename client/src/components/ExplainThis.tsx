/**
 * Axiom Studio — Explain This
 * Voice-powered code walkthrough using SpeechSynthesis API.
 * Zero server cost — entirely browser-based.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useCallback, useRef } from "react";
import { Volume2, VolumeX, Pause, Play, Loader2 } from "lucide-react";

interface Props {
  /** The code or text to explain */
  content: string;
  /** Optional language hint */
  language?: string;
  /** If provided, use the agent to generate the explanation first */
  onRequestExplanation?: (content: string) => Promise<string>;
}

export default function ExplainThis({ content, language, onRequestExplanation }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "speaking" | "paused">("idle");
  const [explanation, setExplanation] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(async () => {
    if (state === "speaking") {
      speechSynthesis.pause();
      setState("paused");
      return;
    }
    if (state === "paused") {
      speechSynthesis.resume();
      setState("speaking");
      return;
    }

    // Generate explanation if handler provided
    let text = explanation;
    if (!text) {
      if (onRequestExplanation) {
        setState("loading");
        try {
          text = await onRequestExplanation(content);
          setExplanation(text);
        } catch {
          text = `This is a ${language || "code"} block. ${content.slice(0, 200)}`;
          setExplanation(text);
        }
      } else {
        // Simple fallback: read the code directly
        text = `Here's what this ${language || "code"} does: ${content.slice(0, 500)}`;
        setExplanation(text);
      }
    }

    // Use SpeechSynthesis
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Prefer a natural English voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => 
      v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Microsoft"))
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");
    utteranceRef.current = utterance;

    setState("speaking");
    speechSynthesis.speak(utterance);
  }, [state, content, language, explanation, onRequestExplanation]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setState("idle");
  }, []);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <button
        onClick={speak}
        title={state === "idle" ? "Explain this code aloud" : state === "speaking" ? "Pause" : "Resume"}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 4, border: "none",
          background: state === "speaking" ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.05)",
          color: state === "speaking" ? "#22d3ee" : "rgba(255,255,255,0.4)",
          fontSize: 10, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (state === "idle") e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={e => { if (state === "idle") e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
      >
        {state === "loading" && <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />}
        {state === "idle" && <Volume2 style={{ width: 11, height: 11 }} />}
        {state === "speaking" && <Pause style={{ width: 11, height: 11 }} />}
        {state === "paused" && <Play style={{ width: 11, height: 11 }} />}
        {state === "loading" ? "Generating..." : state === "idle" ? "Explain" : state === "speaking" ? "Pause" : "Resume"}
      </button>
      {(state === "speaking" || state === "paused") && (
        <button
          onClick={stop}
          title="Stop"
          style={{
            display: "flex", alignItems: "center",
            padding: "3px 6px", borderRadius: 4, border: "none",
            background: "rgba(239,68,68,0.08)", color: "#f87171",
            fontSize: 10, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <VolumeX style={{ width: 11, height: 11 }} />
        </button>
      )}
    </div>
  );
}
