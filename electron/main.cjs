const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Hide menu bar by default for a cleaner look
    autoHideMenuBar: true
  });

  // Load the built index.html
  // Adjust path to point to dist/index.html relative to this file
  // electron/main.js -> ../dist/index.html
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Open DevTools only in dev mode (optional, disabled here for production feel)
  // win.webContents.openDevTools();
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
