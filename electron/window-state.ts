import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');
const DEFAULTS: WindowState = { width: 1280, height: 800, isMaximized: false };

export function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
    }
  } catch {}
  return DEFAULTS;
}

export function saveWindowState(win: BrowserWindow): void {
  try {
    const state: WindowState = win.isMaximized()
      ? { ...loadWindowState(), isMaximized: true }
      : { ...win.getBounds(), isMaximized: false };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

export function applyWindowState(win: BrowserWindow, state: WindowState): void {
  if (state.isMaximized) win.maximize();
  if (state.x !== undefined && state.y !== undefined) win.setPosition(state.x, state.y);
}
