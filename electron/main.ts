import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron'
import { join } from 'node:path'
import { uIOhook } from 'uiohook-napi'

// Define the absolute path for the renderer
process.env.DIST_ELECTRON = join(__dirname, '../')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let win: BrowserWindow | null = null
const preload = join(__dirname, 'preload.js')

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false // allow media capture if needed
    },
    autoHideMenuBar: true,
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    win.loadURL(devUrl)
    // win.webContents.openDevTools()
  } else {
    // win.loadFile(join(process.env.DIST, 'index.html'))
    win.loadFile(join(process.env.DIST as string, 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  // --- GLOBAL KEYHOOK SETUP ---
  // We use uiohook-napi instead of globalShortcut to not block the key in the actual game
  uIOhook.on('keydown', (e) => {
    // E.g., if we want to listen for 'Z' (forward in AZERTY)
    // We can broadcast the key to the renderer, and the renderer decides if it matches the bind
    if (win && win.webContents) {
      win.webContents.send('global-keydown', { keycode: e.keycode })
    }
  })

  // Start listening to the keyboard/mouse
  uIOhook.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  win = null
  // Stop uiohook when closing
  uIOhook.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC to get screen capture sources
ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] })
  return sources.map(s => ({
    id: s.id,
    name: s.name,
    display_id: s.display_id
  }))
})
