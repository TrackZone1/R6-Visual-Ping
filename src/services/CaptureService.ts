export class CaptureService {
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentStream: MediaStream | null = null;
  
  constructor() {
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.width = 960;
    this.canvasEl.height = 540;
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

    // Calculer la taille pour le plein écran avec un max de 960px de large
    const scale = Math.min(1, 960 / vw);
    const targetW = Math.round(vw * scale);
    const targetH = Math.round(vh * scale);
    
    if (this.canvasEl.width !== targetW) this.canvasEl.width = targetW;
    if (this.canvasEl.height !== targetH) this.canvasEl.height = targetH;
    
    this.ctx.drawImage(this.videoEl, 0, 0, vw, vh, 0, 0, targetW, targetH);
    
    return this.canvasEl.toDataURL('image/webp', 0.6); // Qualité réduite pour compenser la plus grande image
  }
}

export const captureService = new CaptureService();
