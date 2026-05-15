import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Set flag so local-index.ts knows it's running in Electron
process.env.IS_ELECTRON = 'true';
// Set local mode flags
process.env.AXIOM_LOCAL = 'true';
process.env.NODE_ENV = 'production';

process.on('uncaughtException', (err) => {
  dialog.showErrorBox("Axiom Studio Fatal Error", err.toString() + "\n" + err.stack);
});

// Import the local server immediately so it starts binding to the port
// Use dynamic import so env vars are set BEFORE the server module is evaluated
import('../server/local-index.js').catch(err => {
  console.error("Failed to start local server:", err);
  dialog.showErrorBox("Server Startup Error", "Failed to start the background server.\n\n" + err.toString() + "\n" + err.stack);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Axiom Studio",
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox disabled so Firebase OAuth popups can function
      sandbox: false
    },
    show: false, // Don't show until ready
    backgroundColor: '#0d1117' // Dark background to match app
  });

  // Remove the default Electron menu
  mainWindow.setMenuBarVisibility(false);

  // The local-index.ts server defaults to port 5100
  const port = process.env.PORT || '5100';
  const url = `http://localhost:${port}/profile`;

  // Show the window immediately so the user sees something
  mainWindow.show();

  // Wait for Express to bind by retrying loadURL if it fails
  const tryLoadURL = async () => {
    try {
      if (mainWindow) {
        await mainWindow.loadURL(url);
      }
    } catch (err: any) {
      console.log("Server not ready yet, retrying in 1s...", err?.message);
      setTimeout(tryLoadURL, 1000);
    }
  };

  setTimeout(tryLoadURL, 2000);

  // Allow Firebase OAuth popups to open as child windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Firebase auth and Google OAuth popups to open inside the app
    if (url.includes('firebaseapp.com') || 
        url.includes('accounts.google.com') || 
        url.includes('github.com/login') ||
        url.includes('trustlayer') ||
        url.includes(`localhost:${port}`)) {
      return { action: 'allow' };
    }
    // Everything else opens in the default browser
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
