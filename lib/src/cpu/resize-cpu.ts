import { convolveHor, convolveHorWithPre, convolveVert, convolveVertWithPre } from "./convolve";
import { createFilters } from "./create-filter";
import { ResizeOptions } from "../definition";

export function resize(image: HTMLCanvasElement, options: ResizeOptions) {
    const srcW = image.width;
    const srcH = image.height;
    const destW = options.targetWidth;
    const destH = options.targetHeight;
    const scaleX = destW / srcW;
    const scaleY = destH / srcH;
    const offsetX = 0;
    const offsetY = 0;
    const filter = options.filter;

    const src = image.getContext('2d')?.getImageData(0, 0, srcW, srcH).data;
    const tmp = new Uint16Array(destW * srcH * 4);
    const dest = new Uint8Array(destW * destH * 4);
    const filtersX = createFilters(filter, srcW, destW, scaleX, offsetX),
        filtersY = createFilters(filter, srcH, destH, scaleY, offsetY);

    if (hasAlpha(src!, srcW, srcH)) {
        convolveHorWithPre(src!, tmp, srcW, srcH, destW, filtersX);
        convolveVertWithPre(tmp, dest, srcH, destW, destH, filtersY);
    } else {
        convolveHor(src!, tmp, srcW, srcH, destW, filtersX);
        convolveVert(tmp, dest, srcH, destW, destH, filtersY);
        resetAlpha(dest, destW, destH);
    }

    return dest;

}

function hasAlpha(src: Uint8ClampedArray, width: number, height: number) {
    let ptr = 3, len = (width * height * 4) | 0;
    while (ptr < len) {
        if (src[ptr] !== 255) return true;
        ptr = (ptr + 4) | 0;
    }
    return false;
}

function resetAlpha(dst: Uint8Array, width: number, height: number) {
    let ptr = 3, len = (width * height * 4) | 0;
    while (ptr < len) { dst[ptr] = 0xFF; ptr = (ptr + 4) | 0; }
}