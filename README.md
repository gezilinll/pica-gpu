# pica-gpu

**GPU accelerated image resizer based on Pica**

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

resize(source, {
    filter,
    targetWidth,
    targetHeight,
    ...
})
```