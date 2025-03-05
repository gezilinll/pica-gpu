# pica-gpu

**GPU accelerated image resizer**

[![npm version](https://img.shields.io/npm/v/pica-gpu.svg)](https://www.npmjs.com/package/pica-gpu)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[demo](https://pica-gpu.gezilinll.com/)

---

## Overview

Pica-gpu is a high-quality, **GPU-accelerated** image resizer inspired by [Pica](https://github.com/nodeca/pica). While Pica’s original implementation runs on the CPU using JavaScript, pica-gpu leverages **WebGL** to offload filtering and convolution tasks to the GPU. This results in dramatically reduced CPU load and memory usage with a performance improvement of **2-10x** – especially noticeable when processing large images.

Pica-gpu implements a full set of filtering algorithms (including mks2013 and others) on the GPU already.

---

## Features

- **GPU-accelerated image scaling**  
  Offloads per-pixel filtering operations to the GPU via WebGL.

- **High quality filters**  
  Supports advanced filters (e.g. mks2013) with excellent anti-moiré and sharpening effects.

- **Improved performance**  
  Achieves 2-10× speedup over CPU-based Pica, with higher gains on larger images.

- **Reduced CPU and memory usage**  
  Avoids creating extra buffers by performing operations on the GPU.

- **Simpler implementation**  
  Unlike Pica, pica-gpu does not need to handle complexities such as web workers; it only requires WebGL support.

- **Simple API**  
  Designed to be a drop-in alternative to Pica with a similar API surface.

## Installation

You can install pica-gpu via npm:

```bash
npm install pica-gpu
```

## Usage

```
import { resize } from 'pica-gpu'

resize(from, to,
{
    filter,
    targetWidth,
    targetHeight,
})
```

## API

### .resize(from, to, options) -> void

Resize image from one canvas (or image) to another. Sizes are
taken from source and destination objects.

- **from** - source, can be `HTMLCanvasElement`, `HTMLImageElement`, `ImageBitmap` `ImageData`, `OffscreenCanvas`.
- **to** - destination canvas, its size is supposed to be non-zero.
- **options** - quality (number) or object:
  - **filter** - filter name (Default - `mks2013`). See [resize_filter_info.js](https://github.com/gezilinll/pica-gpu/blob/master/lib/src/shaders.ts) for details. `mks2013` does both resize and sharpening, it's optimal and not recommended to change.
- **throw** When an error occurs, an exception containing the corresponding information will be thrown.

**(!)** Because the target canvas must use a WebGL context, no other context type should be requested on it in advance. Otherwise, an error may occur, preventing the resize from working properly.
