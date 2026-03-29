/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getDesktopSources: () => Promise<Array<{ id: string; name: string; display_id: string }>>;
    onGlobalKeyDown: (callback: (keycode: number) => void) => void;
    offGlobalKeyDown: () => void;
  }
}
