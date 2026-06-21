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
import { useSettings } from "../contexts/SettingsContext";
import "@xterm/xterm/css/xterm.css";

interface Props {
  token: string;
  convoId?: string;
  visible: boolean;
  onClose: () => void;
}

export default function TerminalPanel({ token, convoId, visible, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [maximized, setMaximized] = useState(false);
  const { settings } = useSettings();

  // Dynamic settings sync
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = settings.terminal.fontSize;
      termRef.current.options.cursorBlink = settings.terminal.cursorBlink;
      fitRef.current?.fit();
    }
  }, [settings.terminal.fontSize, settings.terminal.cursorBlink]);

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
        magenta: "#38bdf8",
        cyan: "#06b6d4",
        white: "#e2e8f0",
        brightBlack: "#475569",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#7dd3fc",
        brightCyan: "#22d3ee",
        brightWhite: "#f8fafc",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: settings.terminal.fontSize,
      lineHeight: 1.4,
      cursorBlink: settings.terminal.cursorBlink,
      cursorStyle: "bar",
      scrollback: 10000,
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
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal?token=${token}&convoId=${convoId || 'default-workspace'}`;
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
  }, [visible, token, convoId]);

  if (!visible) return null;

  return (
    <div className={`ax-terminal ${maximized ? "ax-terminal--max" : ""}`}>
      <div ref={containerRef} className="ax-terminal-container" />
    </div>
  );
}

// Fallback local mode when WebSocket isn't available
function setupLocalMode(term: XTerminal) {
  term.writeln("\x1b[31m[Error] WebSocket connection failed. Terminal requires WebSockets.\x1b[0m");
}
