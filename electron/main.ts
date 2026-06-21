import { app, BrowserWindow, shell, dialog, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadWindowState, saveWindowState, applyWindowState } from './window-state.js';
import { autoUpdater } from 'electron-updater';

// Set flag so local-index.ts knows it's running in Electron
process.env.IS_ELECTRON = 'true';
// Set local mode flags
process.env.AXIOM_LOCAL = 'true';
process.env.NODE_ENV = 'production';

process.on('uncaughtException', (err) => {
  dialog.showErrorBox("Axiom Studio Fatal Error", err.toString() + "\n" + err.stack);
});

let serverStartAttempts = 0;
const MAX_SERVER_RESTARTS = 3;

async function startServer(): Promise<void> {
  try {
    await import('../server/local-index.js');
  } catch (err: any) {
    serverStartAttempts++;
    console.error(`Server start attempt ${serverStartAttempts} failed:`, err);
    if (serverStartAttempts < MAX_SERVER_RESTARTS) {
      console.log(`Retrying server start in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      return startServer();
    }
    dialog.showErrorBox(
      'Axiom Studio — Server Failed',
      `The background server could not start after ${MAX_SERVER_RESTARTS} attempts.\n\n${err.toString()}`
    );
    app.quit();
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    title: "Axiom Studio",
    icon: path.join(getResourcePath(), 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#0d1117'
  });

  mainWindow.setMenuBarVisibility(false);
  applyWindowState(mainWindow, state);

  const port = process.env.PORT || '5100';

  waitForServer(port).then((ready) => {
    if (!ready) {
      dialog.showErrorBox(
        'Axiom Studio — Server Error',
        'The background server failed to start. Please restart Axiom Studio.\n\nIf this keeps happening, check that port 5100 is not in use.'
      );
      app.quit();
      return;
    }
    if (mainWindow) {
      mainWindow.loadURL(`http://localhost:${port}/`);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('firebaseapp.com') ||
      url.includes('accounts.google.com') ||
      url.includes('github.com/login') ||
      url.includes('trustlayer') ||
      url.includes(`localhost:${port}`)
    ) {
      return { action: 'allow' };
    }
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', (e) => {
    if (mainWindow) saveWindowState(mainWindow);
    if (tray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function waitForServer(port: string, maxAttempts = 40): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function getResourcePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build');
  }
  return path.join(__dirname, '../../build');
}

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('get-version', () => app.getVersion());

let splashWindow: BrowserWindow | null = null;
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    backgroundColor: '#0d1117',
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false }
  });
  splashWindow.loadFile(path.join(getResourcePath(), 'splash.html'));
  splashWindow.show();
}

let tray: Tray | null = null;
function createTray() {
  const icon = nativeImage.createFromPath(path.join(getResourcePath(), 'icon.png'))
    .resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Axiom Studio');
  const menu = Menu.buildFromTemplate([
    { label: 'Open Axiom Studio', click: () => {
      mainWindow?.show();
      mainWindow?.focus();
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.whenReady().then(async () => {
  createTray();
  createSplash();
  await startServer();
  createWindow();
  const ready = await waitForServer(process.env.PORT || '5100');
  if (ready) {
    splashWindow?.close();
    splashWindow = null;
  }

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    app.quit();
  }
});

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version of Axiom Studio is available. It will be downloaded in the background.',
    buttons: ['OK']
  });
});
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version of Axiom Studio has been downloaded. Restart to apply the update.',
    buttons: ['Restart Now', 'Later']
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});
