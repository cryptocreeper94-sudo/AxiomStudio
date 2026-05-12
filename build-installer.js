import { createWindowsInstaller } from 'electron-winstaller';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildInstaller() {
  console.log('Building Axiom Studio Setup.exe installer...');
  try {
    await createWindowsInstaller({
      appDirectory: path.join(__dirname, 'release2', 'Axiom Studio-win32-x64'),
      outputDirectory: path.join(__dirname, 'release2', 'installer'),
      authors: 'DarkWave Studios LLC',
      exe: 'Axiom Studio.exe',
      setupIcon: path.join(__dirname, 'build', 'icon.ico'),
      noMsi: true,
      setupExe: 'Axiom Studio Setup.exe'
    });
    console.log('Successfully created installer at release/installer/Axiom Studio Setup.exe');
  } catch (e) {
    console.error(`Failed to build installer: ${e.message}`);
    process.exit(1);
  }
}

buildInstaller();
