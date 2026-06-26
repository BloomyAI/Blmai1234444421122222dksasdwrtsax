const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let nextServer;

// Poll until Next.js is up
function waitForServer(url, maxTries = 60, interval = 1000) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      const req = http.get(url, { timeout: 2000 }, res => {
        if (res.statusCode < 500) resolve();
        else retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
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

  console.log('Starting Next.js server from:', webDir);
  console.log('Is packaged:', app.isPackaged);

  // Use node to run the next start command
  const nextCommand = isDev 
    ? path.join(webDir, 'node_modules', '.bin', 'next')
    : path.join(webDir, 'node_modules', '.bin', 'next');

  // On Windows, use next.cmd
  const command = process.platform === 'win32' && isDev
    ? path.join(webDir, 'node_modules', '.bin', 'next.cmd')
    : nextCommand;

  const args = ['start', '--port', '3131'];

  console.log('Command:', command);
  console.log('Args:', args);

  nextServer = spawn(
    process.execPath,
    [command, ...args],
    {
      cwd: webDir,
      env: { 
        ...process.env, 
        PORT: '3131',
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1'
      },
      stdio: 'inherit',
      shell: process.platform === 'win32'
    }
  );

  nextServer.on('error', err => console.error('Failed to start Next.js:', err));
  nextServer.on('exit', (code) => console.log('Next.js server exited with code:', code));
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
      console.log('Next.js server is ready');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('http://localhost:3131/chat/new');
      }
    })
    .catch(err => {
      console.error('Failed to wait for server:', err);
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
