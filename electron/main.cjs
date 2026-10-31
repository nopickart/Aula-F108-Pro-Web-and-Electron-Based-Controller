const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Disable GPU sandbox / Linux user-namespace sandbox issues on modern Linux (Ubuntu 24.04, Arch, Debian)
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}
app.commandLine.appendSwitch('enable-features', 'WebHID');

let mainWindow = null;

// Target Aula F108 Pro VID & PID
const AULA_VID = 0x0c45;
const AULA_PID = 0x800a;

function createWindow() {
  const appPath = app.getAppPath();
  const iconPath = path.join(appPath, 'public', 'icon.svg');
  const preloadPath = path.join(appPath, 'electron', 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#020617',
    title: 'Aula F108 Pro Keyboard Controller',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  // Enable native WebHID device permissions for Aula F108 Pro
  const ses = mainWindow.webContents.session;

  // 1. Grant WebHID permission checks automatically
  ses.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'hid') {
      return true;
    }
    return false;
  });

  // 2. Grant device access permissions
  ses.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'hid') {
      return true;
    }
    return false;
  });

  // 3. Automatically select the Aula F108 Pro device when WebHID requests pairing
  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    if (details.deviceList && details.deviceList.length > 0) {
      // Find Aula device if present
      const aulaDevice = details.deviceList.find(
        (d) => d.vendorId === AULA_VID && d.productId === AULA_PID
      );
      if (aulaDevice) {
        callback(aulaDevice.deviceId);
        return;
      }
      // Or select first available HID device
      callback(details.deviceList[0].deviceId);
      return;
    }
    callback('');
  });

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription, validatedURL);
  });

  // Load production build or dev server
  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(appPath, 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Electron] Failed to load index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
