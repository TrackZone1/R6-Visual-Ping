import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  onGlobalKeyDown: (callback: (keycode: number) => void) => {
    ipcRenderer.on('global-keydown', (_event, data) => callback(data.keycode))
  },
  offGlobalKeyDown: () => {
    ipcRenderer.removeAllListeners('global-keydown')
  }
})
