const {
  app,
  BrowserWindow
} = require('electron')
const path = require('path')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
  mainWindow.removeMenu()
  mainWindow.loadFile('index.html')
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(createWindow)