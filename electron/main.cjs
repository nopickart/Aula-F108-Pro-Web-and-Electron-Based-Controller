const { app, BrowserWindow, session } = require('electron');
const path = require('path');

let mainWindow = null;

// Target Aula F108 Pro VID & PID
const AULA_VID = 0x0c45;
const AULA_PID = 0x800a;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#020617',
    title: 'Aula F108 Pro Keyboard Controller',
    icon: path.join(__dirname, '../public/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
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
  mainWindow.webContents.session.on('select-hid-device', (event, details, callback) => {
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

  // Load production build or dev server
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
