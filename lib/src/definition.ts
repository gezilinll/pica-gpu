export interface ResizeOptions {
    targetWidth: number;
    targetHeight: number;
    drawToCanvas?: HTMLCanvasElement;
    filter: 'box' | 'hamming' | 'lanczos2' | 'lanczos3' | 'mks2013';
  }