import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import jwt from "jsonwebtoken";
import os from "os";
import path from "path";
import fs from "fs";

export function setupTerminalWebSocket(server: any) {
  const wss = new WebSocketServer({ noServer: true });
  const BASE_WORKSPACES_DIR = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), "workspaces");

  server.on("upgrade", (request: any, socket: any, head: any) => {
    if (request.url.startsWith("/ws/terminal")) {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      const token = url.searchParams.get("token");

      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      let decoded: any = null;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        );
      } catch {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        // Pass decoded user info via request object
        (request as any).user = decoded;
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket, req: any) => {
    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    
    let ptyProcess: pty.IPty | null = null;
    try {
      const userId = req.user?.id || "anonymous";
      const userWorkspace = path.join(BASE_WORKSPACES_DIR, userId);
      
      // Ensure directory exists synchronously (or fallback to cwd)
      if (!fs.existsSync(userWorkspace)) {
        fs.mkdirSync(userWorkspace, { recursive: true });
      }

      const safeEnv = {
        PATH: process.env.PATH || "",
        HOME: userWorkspace,
        TERM: "xterm-color",
        USER: userId,
      };

      ptyProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: userWorkspace,
        env: safeEnv as any,
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
