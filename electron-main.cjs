const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'حسابداری مَه - نسخه تحت ویندوز',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: false,
  });

  // Custom Application Menu in Persian
  const template = [
    {
      label: 'عملیات',
      submenu: [
        {
          label: 'تازه‌سازی صفحه (Refresh)',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload(),
        },
        {
          label: 'تغییر اندازه به حالت تمام‌صفحه',
          accelerator: 'F11',
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
        { type: 'separator' },
        {
          label: 'خروج از برنامه',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'ابزارها',
      submenu: [
        {
          label: 'چاپ فاکتور و گزارش (Print)',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.print(),
        },
        {
          label: 'ابزارهای توسعه‌دهنده (DevTools)',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'راهنما',
      submenu: [
        {
          label: 'درباره نرم‌افزار حسابداری مَه',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'درباره حسابداری مَه',
              message: 'نرم‌افزار جامع حسابداری و مالی مَه',
              detail: 'نسخه کلاینت ویندوز\nطراحی شده برای مدیریت حسابداری دوبل، فاکتورها، خزانه‌داری، چک و انبارداری.',
              buttons: ['تایید'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Load the production build
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadURL(
    url.format({
      pathname: indexPath,
      protocol: 'file:',
      slashes: true,
    })
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
