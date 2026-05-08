import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import jwt from "jsonwebtoken";
import os from "os";

export function setupTerminalWebSocket(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    if (request.url.startsWith("/ws/terminal")) {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      const token = url.searchParams.get("token");

      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      try {
        jwt.verify(
          token,
          process.env.JWT_SECRET || process.env.DATABASE_URL?.slice(0, 32) || "dw-axiom-fallback-secret-change-me"
        );
      } catch {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    
    let ptyProcess: pty.IPty | null = null;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.cwd(),
        env: process.env as any,
      });

      ptyProcess.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      ws.on("message", (msg) => {
        ptyProcess?.write(msg.toString());
      });

      ws.on("close", () => {
        ptyProcess?.kill();
      });
    } catch (err: any) {
      console.error("[PTY] Error spawning pseudo-terminal:", err.message);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\x1b[31m[Server] Error spawning terminal: ${err.message}\x1b[0m\r\n`);
        ws.close();
      }
    }
  });

  console.log("[Axiom Studio] Terminal WebSocket server initialized.");
}
