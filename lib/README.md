# pica-gpu

A GPU-accelerated image resizing library using WebGL 2.0.

## Features

- GPU-accelerated image resizing using WebGL 2.0
- Support for various resize filters (Hamming, Lanczos2, etc.)
- TypeScript support
- Zero dependencies

## Installation

```bash
npm install pica-gpu
# or
pnpm add pica-gpu
# or
yarn add pica-gpu
```

## Usage

```typescript
import { resizeGL } from 'pica-gpu';

// Create a canvas with your source image
const sourceCanvas = document.createElement('canvas');
const ctx = sourceCanvas.getContext('2d');
const img = new Image();
img.onload = () => {
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  ctx?.drawImage(img, 0, 0);
};
img.src = 'your-image.jpg';

// Create a target canvas
const targetCanvas = document.createElement('canvas');
targetCanvas.width = 480;
targetCanvas.height = 320;

// Resize the image
resize(sourceCanvas, {
  filter: 'hamming',
  drawToCanvas: targetCanvas,
  targetWidth: 480,
  targetHeight: 320
});
```

## API

### resizeGL(source: HTMLCanvasElement, options: ResizeOptions)

Resizes the source canvas to the target dimensions using WebGL 2.0.

#### Parameters

- `source`: HTMLCanvasElement - The source canvas containing the image to resize
- `options`: ResizeOptions
  - `filter`: 'hamming' | 'lanczos2' - The resize filter to use
  - `targetWidth`: number - The desired width
  - `targetHeight`: number - The desired height
  - `drawToCanvas`: HTMLCanvasElement - Optional canvas to draw the result to

#### Returns

- Uint8Array - The pixel data of the resized image (if drawToCanvas is not provided)

## License

MIT 