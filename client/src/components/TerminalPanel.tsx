/**
 * Axiom Studio — Terminal Panel
 * xterm.js terminal with WebSocket backend.
 * DarkWave Studios LLC — Copyright 2026
 */
import { useEffect, useRef, useState } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Plus, X, Maximize2, Minimize2 } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

interface Props {
  token: string;
  visible: boolean;
  onClose: () => void;
}

export default function TerminalPanel({ token, visible, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!visible || !containerRef.current) return;
    if (termRef.current) {
      fitRef.current?.fit();
      return;
    }

    const term = new XTerminal({
      theme: {
        background: "#080910",
        foreground: "#e2e8f0",
        cursor: "#06b6d4",
        cursorAccent: "#080910",
        selectionBackground: "#06b6d440",
        black: "#0a0b10",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e2e8f0",
        brightBlack: "#475569",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#f8fafc",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 5000,
    });

    const fit = new FitAddon();
    const links = new WebLinksAddon();
    term.loadAddon(fit);
    term.loadAddon(links);
    term.open(containerRef.current);

    setTimeout(() => fit.fit(), 50);

    termRef.current = term;
    fitRef.current = fit;

    // Connect WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln("\x1b[36m⚡ Axiom Studio Terminal\x1b[0m");
      term.writeln("\x1b[90mDarkWave Studios LLC — Connected\x1b[0m\r\n");
    };

    ws.onmessage = (e) => {
      term.write(e.data);
    };

    ws.onerror = () => {
      term.writeln("\r\n\x1b[31m✖ WebSocket error — terminal running in local mode\x1b[0m\r\n");
      // Fallback: simple local echo
      setupLocalMode(term);
    };

    ws.onclose = () => {
      term.writeln("\r\n\x1b[33m⚠ Connection closed\x1b[0m");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      setTimeout(() => fit.fit(), 10);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
    };
  }, [visible, token]);

  if (!visible) return null;

  return (
    <div className={`ax-terminal ${maximized ? "ax-terminal--max" : ""}`}>
      <div ref={containerRef} className="ax-terminal-container" />
    </div>
  );
}

// Fallback local mode when WebSocket isn't available
function setupLocalMode(term: XTerminal) {
  let cmd = "";
  term.write("$ ");
  term.onData((data) => {
    if (data === "\r") {
      term.writeln("");
      if (cmd.trim()) {
        // Send command to REST API fallback
        fetch("/api/workspace/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd.trim() }),
        })
          .then(r => r.json())
          .then(r => {
            if (r.stdout) term.write(r.stdout.replace(/\n/g, "\r\n"));
            if (r.stderr) term.write(`\x1b[31m${r.stderr.replace(/\n/g, "\r\n")}\x1b[0m`);
            term.write("\r\n$ ");
          })
          .catch(() => {
            term.writeln(`\x1b[31mCommand execution not available\x1b[0m`);
            term.write("$ ");
          });
      } else {
        term.write("$ ");
      }
      cmd = "";
    } else if (data === "\x7f") {
      if (cmd.length > 0) {
        cmd = cmd.slice(0, -1);
        term.write("\b \b");
      }
    } else {
      cmd += data;
      term.write(data);
    }
  });
}
