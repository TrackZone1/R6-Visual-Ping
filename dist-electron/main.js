let electron = require("electron");
let node_path = require("node:path");
let uiohook_napi = require("uiohook-napi");
//#region electron/main.ts
process.env.DIST_ELECTRON = (0, node_path.join)(__dirname, "../");
process.env.DIST = (0, node_path.join)(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? (0, node_path.join)(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
var win = null;
var preload = (0, node_path.join)(__dirname, "preload.js");
function createWindow() {
	win = new electron.BrowserWindow({
		width: 1e3,
		height: 700,
		webPreferences: {
			preload,
			nodeIntegration: true,
			contextIsolation: true,
			webSecurity: false
		},
		autoHideMenuBar: true
	});
	const devUrl = process.env.VITE_DEV_SERVER_URL;
	if (devUrl) win.loadURL(devUrl);
	else win.loadFile((0, node_path.join)(process.env.DIST, "index.html"));
}
electron.app.whenReady().then(() => {
	createWindow();
	uiohook_napi.uIOhook.on("keydown", (e) => {
		if (win && win.webContents) win.webContents.send("global-keydown", { keycode: e.keycode });
	});
	uiohook_napi.uIOhook.start();
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
electron.app.on("window-all-closed", () => {
	win = null;
	uiohook_napi.uIOhook.stop();
	if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("get-desktop-sources", async () => {
	return (await electron.desktopCapturer.getSources({ types: ["window", "screen"] })).map((s) => ({
		id: s.id,
		name: s.name,
		display_id: s.display_id
	}));
});
//#endregion
