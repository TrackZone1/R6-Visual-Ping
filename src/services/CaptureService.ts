export class CaptureService {
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentStream: MediaStream | null = null;
  
  constructor() {
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.width = 300;
    this.canvasEl.height = 300;
    this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true })!;
  }

  async startCapture(sourceId: string) {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        } as any
      });

      this.currentStream = stream;
      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = stream;
      this.videoEl.onloadedmetadata = () => this.videoEl?.play();
      
      return true;
    } catch (e) {
      console.error('Capture start failed:', e);
      return false;
    }
  }

  stopCapture() {
    if (this.currentStream) {
       this.currentStream.getTracks().forEach(t => t.stop());
       this.currentStream = null;
    }
    if (this.videoEl) {
       this.videoEl.srcObject = null;
       this.videoEl = null;
    }
  }

  captureFrame(): string | null {
    if (!this.videoEl || !this.currentStream) return null;
    
    const vw = this.videoEl.videoWidth;
    const vh = this.videoEl.videoHeight;
    if (vw === 0 || vh === 0) return null;

    const cropSize = 300;
    
    const sx = Math.floor(vw / 2 - cropSize / 2);
    const sy = Math.floor(vh / 2 - cropSize / 2);
    
    this.ctx.drawImage(this.videoEl, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
    
    return this.canvasEl.toDataURL('image/webp', 0.8);
  }
}

export const captureService = new CaptureService();
