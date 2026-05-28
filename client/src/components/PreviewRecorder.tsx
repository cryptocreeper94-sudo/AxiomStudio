/**
 * Axiom Studio — Preview Recorder
 * Records the preview iframe as a short video using MediaRecorder API.
 * Zero server cost — entirely client-side.
 *
 * DarkWave Studios LLC — Copyright 2026
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Video, Square, Download, Loader2, Circle } from "lucide-react";

interface Props {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  maxDurationMs?: number;
}

export default function PreviewRecorder({ iframeRef, maxDurationMs = 8000 }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setVideoUrl(null);
      chunksRef.current = [];

      const iframe = iframeRef.current;
      if (!iframe) { setError("No preview to record"); return; }

      // Try to capture the iframe's content
      // Method 1: Use getDisplayMedia (requires user gesture)
      let stream: MediaStream;
      
      try {
        // Try captureStream on the iframe if same-origin
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Canvas-based capture for same-origin iframes
          const canvas = document.createElement("canvas");
          const rect = iframe.getBoundingClientRect();
          canvas.width = Math.min(rect.width * 2, 1920);
          canvas.height = Math.min(rect.height * 2, 1080);
          
          stream = canvas.captureStream(30); // 30 FPS
          
          // Start frame capture loop
          const ctx = canvas.getContext("2d")!;
          const captureFrame = () => {
            if (!recording) return;
            try {
              // Use html2canvas-like approach
              ctx.fillStyle = "#0f172a";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Draw iframe content via foreignObject SVG
              const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
                <foreignObject width="100%" height="100%">
                  <div xmlns="http://www.w3.org/1999/xhtml">${iframeDoc.documentElement.outerHTML}</div>
                </foreignObject>
              </svg>`;
              
              const img = new Image();
              const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
              const url = URL.createObjectURL(svgBlob);
              img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
              };
              img.src = url;
            } catch {
              // Cross-origin or security error — fallback
            }
            requestAnimationFrame(captureFrame);
          };
          requestAnimationFrame(captureFrame);
        } else {
          throw new Error("cross-origin");
        }
      } catch {
        // Fallback: use getDisplayMedia (prompts user to select screen area)
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
        videoBitsPerSecond: 2_500_000, // 2.5 Mbps
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = recorder;
      setRecording(true);
      startTimeRef.current = Date.now();

      // Elapsed timer
      timerRef.current = setInterval(() => {
        const e = Date.now() - startTimeRef.current;
        setElapsed(e);
        if (e >= maxDurationMs) {
          recorder.stop();
        }
      }, 100);

    } catch (err: any) {
      setError(err.message || "Failed to start recording");
      setRecording(false);
    }
  }, [iframeRef, maxDurationMs]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const downloadVideo = useCallback(() => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `axiom-preview-${Date.now()}.webm`;
    a.click();
  }, [videoUrl]);

  const elapsedSec = (elapsed / 1000).toFixed(1);
  const maxSec = (maxDurationMs / 1000).toFixed(0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {!recording && !videoUrl && (
        <button
          onClick={startRecording}
          title="Record preview (up to 8 seconds)"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
            color: "#f87171", fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
        >
          <Video style={{ width: 12, height: 12 }} /> Record
        </button>
      )}

      {recording && (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            color: "#ef4444",
          }}>
            <Circle style={{ width: 8, height: 8, fill: "#ef4444", animation: "pulse-dot 1s infinite" }} />
            {elapsedSec}s / {maxSec}s
          </div>
          <button
            onClick={stopRecording}
            title="Stop recording"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6,
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Square style={{ width: 10, height: 10, fill: "#ef4444" }} /> Stop
          </button>
        </>
      )}

      {videoUrl && (
        <button
          onClick={downloadVideo}
          title="Download recording"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6,
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
            color: "#4ade80", fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Download style={{ width: 12, height: 12 }} /> Download .webm
        </button>
      )}

      {error && (
        <span style={{ fontSize: 9, color: "#f87171" }}>{error}</span>
      )}
    </div>
  );
}
