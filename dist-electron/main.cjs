import { BrowserWindow, app, desktopCapturer, ipcMain } from "electron";
import { join } from "node:path";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, { get: (a, b) => (typeof require !== "undefined" ? require : a)[b] }) : x)(function(x) {
	if (typeof require !== "undefined") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + x + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
});
//#endregion
//#region node_modules/node-gyp-build/node-gyp-build.js
var require_node_gyp_build$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs = __require("fs");
	var path = __require("path");
	var os = __require("os");
	var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
	var vars = process.config && process.config.variables || {};
	var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
	var abi = process.versions.modules;
	var runtime = isElectron() ? "electron" : isNwjs() ? "node-webkit" : "node";
	var arch = process.env.npm_config_arch || os.arch();
	var platform = process.env.npm_config_platform || os.platform();
	var libc = process.env.LIBC || (isAlpine(platform) ? "musl" : "glibc");
	var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
	var uv = (process.versions.uv || "").split(".")[0];
	module.exports = load;
	function load(dir) {
		return runtimeRequire(load.resolve(dir));
	}
	load.resolve = load.path = function(dir) {
		dir = path.resolve(dir || ".");
		try {
			var name = runtimeRequire(path.join(dir, "package.json")).name.toUpperCase().replace(/-/g, "_");
			if (process.env[name + "_PREBUILD"]) dir = process.env[name + "_PREBUILD"];
		} catch (err) {}
		if (!prebuildsOnly) {
			var release = getFirst(path.join(dir, "build/Release"), matchBuild);
			if (release) return release;
			var debug = getFirst(path.join(dir, "build/Debug"), matchBuild);
			if (debug) return debug;
		}
		var prebuild = resolve(dir);
		if (prebuild) return prebuild;
		var nearby = resolve(path.dirname(process.execPath));
		if (nearby) return nearby;
		var target = [
			"platform=" + platform,
			"arch=" + arch,
			"runtime=" + runtime,
			"abi=" + abi,
			"uv=" + uv,
			armv ? "armv=" + armv : "",
			"libc=" + libc,
			"node=" + process.versions.node,
			process.versions.electron ? "electron=" + process.versions.electron : "",
			typeof __webpack_require__ === "function" ? "webpack=true" : ""
		].filter(Boolean).join(" ");
		throw new Error("No native build was found for " + target + "\n    loaded from: " + dir + "\n");
		function resolve(dir) {
			var tuple = readdirSync(path.join(dir, "prebuilds")).map(parseTuple).filter(matchTuple(platform, arch)).sort(compareTuples)[0];
			if (!tuple) return;
			var prebuilds = path.join(dir, "prebuilds", tuple.name);
			var winner = readdirSync(prebuilds).map(parseTags).filter(matchTags(runtime, abi)).sort(compareTags(runtime))[0];
			if (winner) return path.join(prebuilds, winner.file);
		}
	};
	function readdirSync(dir) {
		try {
			return fs.readdirSync(dir);
		} catch (err) {
			return [];
		}
	}
	function getFirst(dir, filter) {
		var files = readdirSync(dir).filter(filter);
		return files[0] && path.join(dir, files[0]);
	}
	function matchBuild(name) {
		return /\.node$/.test(name);
	}
	function parseTuple(name) {
		var arr = name.split("-");
		if (arr.length !== 2) return;
		var platform = arr[0];
		var architectures = arr[1].split("+");
		if (!platform) return;
		if (!architectures.length) return;
		if (!architectures.every(Boolean)) return;
		return {
			name,
			platform,
			architectures
		};
	}
	function matchTuple(platform, arch) {
		return function(tuple) {
			if (tuple == null) return false;
			if (tuple.platform !== platform) return false;
			return tuple.architectures.includes(arch);
		};
	}
	function compareTuples(a, b) {
		return a.architectures.length - b.architectures.length;
	}
	function parseTags(file) {
		var arr = file.split(".");
		var extension = arr.pop();
		var tags = {
			file,
			specificity: 0
		};
		if (extension !== "node") return;
		for (var i = 0; i < arr.length; i++) {
			var tag = arr[i];
			if (tag === "node" || tag === "electron" || tag === "node-webkit") tags.runtime = tag;
			else if (tag === "napi") tags.napi = true;
			else if (tag.slice(0, 3) === "abi") tags.abi = tag.slice(3);
			else if (tag.slice(0, 2) === "uv") tags.uv = tag.slice(2);
			else if (tag.slice(0, 4) === "armv") tags.armv = tag.slice(4);
			else if (tag === "glibc" || tag === "musl") tags.libc = tag;
			else continue;
			tags.specificity++;
		}
		return tags;
	}
	function matchTags(runtime, abi) {
		return function(tags) {
			if (tags == null) return false;
			if (tags.runtime && tags.runtime !== runtime && !runtimeAgnostic(tags)) return false;
			if (tags.abi && tags.abi !== abi && !tags.napi) return false;
			if (tags.uv && tags.uv !== uv) return false;
			if (tags.armv && tags.armv !== armv) return false;
			if (tags.libc && tags.libc !== libc) return false;
			return true;
		};
	}
	function runtimeAgnostic(tags) {
		return tags.runtime === "node" && tags.napi;
	}
	function compareTags(runtime) {
		return function(a, b) {
			if (a.runtime !== b.runtime) return a.runtime === runtime ? -1 : 1;
			else if (a.abi !== b.abi) return a.abi ? -1 : 1;
			else if (a.specificity !== b.specificity) return a.specificity > b.specificity ? -1 : 1;
			else return 0;
		};
	}
	function isNwjs() {
		return !!(process.versions && process.versions.nw);
	}
	function isElectron() {
		if (process.versions && process.versions.electron) return true;
		if (process.env.ELECTRON_RUN_AS_NODE) return true;
		return typeof window !== "undefined" && window.process && window.process.type === "renderer";
	}
	function isAlpine(platform) {
		return platform === "linux" && fs.existsSync("/etc/alpine-release");
	}
	load.parseTags = parseTags;
	load.matchTags = matchTags;
	load.compareTags = compareTags;
	load.parseTuple = parseTuple;
	load.matchTuple = matchTuple;
	load.compareTuples = compareTuples;
}));
//#endregion
//#region node_modules/node-gyp-build/index.js
var require_node_gyp_build = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
	if (typeof runtimeRequire.addon === "function") module.exports = runtimeRequire.addon.bind(runtimeRequire);
	else module.exports = require_node_gyp_build$1();
}));
//#endregion
//#region electron/main.ts
var import_dist = (/* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.uIOhook = exports.UiohookKey = exports.WheelDirection = exports.EventType = void 0;
	var events_1 = __require("events");
	var path_1 = __require("path");
	var lib = require_node_gyp_build()((0, path_1.join)(__dirname, ".."));
	var KeyToggle;
	(function(KeyToggle) {
		KeyToggle[KeyToggle["Tap"] = 0] = "Tap";
		KeyToggle[KeyToggle["Down"] = 1] = "Down";
		KeyToggle[KeyToggle["Up"] = 2] = "Up";
	})(KeyToggle || (KeyToggle = {}));
	var EventType;
	(function(EventType) {
		EventType[EventType["EVENT_KEY_PRESSED"] = 4] = "EVENT_KEY_PRESSED";
		EventType[EventType["EVENT_KEY_RELEASED"] = 5] = "EVENT_KEY_RELEASED";
		EventType[EventType["EVENT_MOUSE_CLICKED"] = 6] = "EVENT_MOUSE_CLICKED";
		EventType[EventType["EVENT_MOUSE_PRESSED"] = 7] = "EVENT_MOUSE_PRESSED";
		EventType[EventType["EVENT_MOUSE_RELEASED"] = 8] = "EVENT_MOUSE_RELEASED";
		EventType[EventType["EVENT_MOUSE_MOVED"] = 9] = "EVENT_MOUSE_MOVED";
		EventType[EventType["EVENT_MOUSE_WHEEL"] = 11] = "EVENT_MOUSE_WHEEL";
	})(EventType || (exports.EventType = EventType = {}));
	var WheelDirection;
	(function(WheelDirection) {
		WheelDirection[WheelDirection["VERTICAL"] = 3] = "VERTICAL";
		WheelDirection[WheelDirection["HORIZONTAL"] = 4] = "HORIZONTAL";
	})(WheelDirection || (exports.WheelDirection = WheelDirection = {}));
	exports.UiohookKey = {
		Backspace: 14,
		Tab: 15,
		Enter: 28,
		CapsLock: 58,
		Escape: 1,
		Space: 57,
		PageUp: 3657,
		PageDown: 3665,
		End: 3663,
		Home: 3655,
		ArrowLeft: 57419,
		ArrowUp: 57416,
		ArrowRight: 57421,
		ArrowDown: 57424,
		Insert: 3666,
		Delete: 3667,
		0: 11,
		1: 2,
		2: 3,
		3: 4,
		4: 5,
		5: 6,
		6: 7,
		7: 8,
		8: 9,
		9: 10,
		A: 30,
		B: 48,
		C: 46,
		D: 32,
		E: 18,
		F: 33,
		G: 34,
		H: 35,
		I: 23,
		J: 36,
		K: 37,
		L: 38,
		M: 50,
		N: 49,
		O: 24,
		P: 25,
		Q: 16,
		R: 19,
		S: 31,
		T: 20,
		U: 22,
		V: 47,
		W: 17,
		X: 45,
		Y: 21,
		Z: 44,
		Numpad0: 82,
		Numpad1: 79,
		Numpad2: 80,
		Numpad3: 81,
		Numpad4: 75,
		Numpad5: 76,
		Numpad6: 77,
		Numpad7: 71,
		Numpad8: 72,
		Numpad9: 73,
		NumpadMultiply: 55,
		NumpadAdd: 78,
		NumpadSubtract: 74,
		NumpadDecimal: 83,
		NumpadDivide: 3637,
		NumpadEnter: 3612,
		NumpadEnd: 61007,
		NumpadArrowDown: 61008,
		NumpadPageDown: 61009,
		NumpadArrowLeft: 61003,
		NumpadArrowRight: 61005,
		NumpadHome: 60999,
		NumpadArrowUp: 61e3,
		NumpadPageUp: 61001,
		NumpadInsert: 61010,
		NumpadDelete: 61011,
		F1: 59,
		F2: 60,
		F3: 61,
		F4: 62,
		F5: 63,
		F6: 64,
		F7: 65,
		F8: 66,
		F9: 67,
		F10: 68,
		F11: 87,
		F12: 88,
		F13: 91,
		F14: 92,
		F15: 93,
		F16: 99,
		F17: 100,
		F18: 101,
		F19: 102,
		F20: 103,
		F21: 104,
		F22: 105,
		F23: 106,
		F24: 107,
		Semicolon: 39,
		Equal: 13,
		Comma: 51,
		Minus: 12,
		Period: 52,
		Slash: 53,
		Backquote: 41,
		BracketLeft: 26,
		Backslash: 43,
		BracketRight: 27,
		Quote: 40,
		Ctrl: 29,
		CtrlRight: 3613,
		Alt: 56,
		AltRight: 3640,
		Shift: 42,
		ShiftRight: 54,
		Meta: 3675,
		MetaRight: 3676,
		NumLock: 69,
		ScrollLock: 70,
		PrintScreen: 3639
	};
	var UiohookNapi = class extends events_1.EventEmitter {
		handler(e) {
			this.emit("input", e);
			switch (e.type) {
				case EventType.EVENT_KEY_PRESSED:
					this.emit("keydown", e);
					break;
				case EventType.EVENT_KEY_RELEASED:
					this.emit("keyup", e);
					break;
				case EventType.EVENT_MOUSE_CLICKED:
					this.emit("click", e);
					break;
				case EventType.EVENT_MOUSE_MOVED:
					this.emit("mousemove", e);
					break;
				case EventType.EVENT_MOUSE_PRESSED:
					this.emit("mousedown", e);
					break;
				case EventType.EVENT_MOUSE_RELEASED:
					this.emit("mouseup", e);
					break;
				case EventType.EVENT_MOUSE_WHEEL:
					this.emit("wheel", e);
					break;
			}
		}
		start() {
			lib.start(this.handler.bind(this));
		}
		stop() {
			lib.stop();
		}
		keyTap(key, modifiers = []) {
			if (!modifiers.length) {
				lib.keyTap(key, KeyToggle.Tap);
				return;
			}
			for (const modKey of modifiers) lib.keyTap(modKey, KeyToggle.Down);
			lib.keyTap(key, KeyToggle.Tap);
			let i = modifiers.length;
			while (i--) lib.keyTap(modifiers[i], KeyToggle.Up);
		}
		keyToggle(key, toggle) {
			lib.keyTap(key, toggle === "down" ? KeyToggle.Down : KeyToggle.Up);
		}
	};
	exports.uIOhook = new UiohookNapi();
})))();
process.env.DIST_ELECTRON = join(__dirname, "../");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
var win = null;
var preload = join(__dirname, "preload.js");
function createWindow() {
	win = new BrowserWindow({
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
	else win.loadFile(join(process.env.DIST, "index.html"));
}
app.whenReady().then(() => {
	createWindow();
	import_dist.uIOhook.on("keydown", (e) => {
		if (win && win.webContents) win.webContents.send("global-keydown", { keycode: e.keycode });
	});
	import_dist.uIOhook.start();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	win = null;
	import_dist.uIOhook.stop();
	if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("get-desktop-sources", async () => {
	return (await desktopCapturer.getSources({ types: ["window", "screen"] })).map((s) => ({
		id: s.id,
		name: s.name,
		display_id: s.display_id
	}));
});
//#endregion
