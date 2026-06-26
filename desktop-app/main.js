const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let nextServer;

// Poll until Next.js is up
function waitForServer(url, maxTries = 40, interval = 500) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      http.get(url, res => {
        if (res.statusCode < 500) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (++tries >= maxTries) return reject(new Error('Next.js server did not start'));
      setTimeout(check, interval);
    };
    check();
  });
}

function startNextServer() {
  const isDev = !app.isPackaged;
  const webDir = isDev 
    ? path.join(__dirname, '..', 'web')
    : path.join(process.resourcesPath, 'web');

  // Use the actual next CLI script rather than relying on .bin symlinks
  const nextScript = path.join(webDir, 'node_modules', 'next', 'dist', 'bin', 'next');

  nextServer = spawn(
    process.execPath,
    [nextScript, 'start', '--port', '3131'],
    {
      cwd: webDir,
      env: { 
        ...process.env, 
        PORT: '3131',
        ELECTRON_RUN_AS_NODE: '1'
      },
      stdio: 'inherit',
    }
  );

  nextServer.on('error', err => console.error('Failed to start Next.js:', err));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#13151C',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'logo.png'),
  });

  // Remove native menu bar
  Menu.setApplicationMenu(null);

  // Show a loading screen while Next.js boots
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  waitForServer('http://localhost:3131/')
    .then(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('http://localhost:3131/chat/new');
      }
    })
    .catch(err => {
      console.error(err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('http://localhost:3131/chat/new');
      }
    });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC handlers for frameless window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

app.whenReady().then(() => {
  startNextServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (nextServer) nextServer.kill();
  if (process.platform !== 'darwin') app.quit();
});
