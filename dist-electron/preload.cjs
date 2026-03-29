let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	getDesktopSources: () => electron.ipcRenderer.invoke("get-desktop-sources"),
	onGlobalKeyDown: (callback) => {
		electron.ipcRenderer.on("global-keydown", (_event, data) => callback(data.keycode));
	},
	offGlobalKeyDown: () => {
		electron.ipcRenderer.removeAllListeners("global-keydown");
	}
});
//#endregion
