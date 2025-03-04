const filters = {
    // Nearest neibor
    box: {
        win: 0.5,
        fn: function (x: number) {
            if (x < 0) x = -x;
            return (x < 0.5) ? 1.0 : 0.0;
        }
    },
    // // Hamming
    hamming: {
        win: 1.0,
        fn: function (x: number) {
            if (x < 0) x = -x;
            if (x >= 1.0) { return 0.0; }
            if (x < 1.19209290E-07) { return 1.0; }
            var xpi = x * Math.PI;
            return ((Math.sin(xpi) / xpi) * (0.54 + 0.46 * Math.cos(xpi / 1.0)));
        }
    },
    // Lanczos, win = 2
    lanczos2: {
        win: 2.0,
        fn: function (x: number) {
            if (x < 0) x = -x;
            if (x >= 2.0) { return 0.0; }
            if (x < 1.19209290E-07) { return 1.0; }
            var xpi = x * Math.PI;
            return (Math.sin(xpi) / xpi) * Math.sin(xpi / 2.0) / (xpi / 2.0);
        }
    },
    // Lanczos, win = 3
    lanczos3: {
        win: 3.0,
        fn: function (x: number) {
            if (x < 0) x = -x;
            if (x >= 3.0) { return 0.0; }
            if (x < 1.19209290E-07) { return 1.0; }
            var xpi = x * Math.PI;
            return (Math.sin(xpi) / xpi) * Math.sin(xpi / 3.0) / (xpi / 3.0);
        }
    },
    // Magic Kernel Sharp 2013, win = 2.5
    // http://johncostella.com/magic/
    mks2013: {
        win: 2.5,
        fn: function (x: number) {
            if (x < 0) x = -x;
            if (x >= 2.5) { return 0.0; }
            if (x >= 1.5) { return -0.125 * (x - 2.5) * (x - 2.5); }
            if (x >= 0.5) { return 0.25 * (4 * x * x - 11 * x + 7); }
            return 1.0625 - 1.75 * x * x;
        }
    }
};

// Precision of fixed FP values
var FIXED_FRAC_BITS = 14;
function toFixedPoint(num: number) {
    return Math.round(num * ((1 << FIXED_FRAC_BITS) - 1));
}

export function createFilters(filter: 'hamming' | 'lanczos2', srcSize: number, destSize: number, scale: number, offset: number) {

    var filterFunction = filters[filter].fn;

    var scaleInverted = 1.0 / scale;
    var scaleClamped = Math.min(1.0, scale); // For upscale

    // Filter window (averaging interval), scaled to src image
    var srcWindow = filters[filter].win / scaleClamped;

    var destPixel, srcPixel, srcFirst, srcLast, filterElementSize,
        floatFilter, fxpFilter, total, pxl, idx, floatVal, filterTotal, filterVal;
    var leftNotEmpty, rightNotEmpty, filterShift, filterSize;

    var maxFilterElementSize = Math.floor((srcWindow + 1) * 2);
    var packedFilter = new Int16Array((maxFilterElementSize + 2) * destSize);
    var packedFilterPtr = 0;

    var slowCopy = !packedFilter.subarray || !packedFilter.set;

    // For each destination pixel calculate source range and built filter values
    for (destPixel = 0; destPixel < destSize; destPixel++) {

        // Scaling should be done relative to central pixel point
        srcPixel = (destPixel + 0.5) * scaleInverted + offset;

        srcFirst = Math.max(0, Math.floor(srcPixel - srcWindow));
        srcLast = Math.min(srcSize - 1, Math.ceil(srcPixel + srcWindow));

        filterElementSize = srcLast - srcFirst + 1;
        floatFilter = new Float32Array(filterElementSize);
        fxpFilter = new Int16Array(filterElementSize);

        total = 0.0;

        // Fill filter values for calculated range
        for (pxl = srcFirst, idx = 0; pxl <= srcLast; pxl++, idx++) {
            floatVal = filterFunction(((pxl + 0.5) - srcPixel) * scaleClamped);
            total += floatVal;
            floatFilter[idx] = floatVal;
        }

        // Normalize filter, convert to fixed point and accumulate conversion error
        filterTotal = 0;

        for (idx = 0; idx < floatFilter.length; idx++) {
            filterVal = floatFilter[idx] / total;
            filterTotal += filterVal;
            fxpFilter[idx] = toFixedPoint(filterVal);
        }

        // Compensate normalization error, to minimize brightness drift
        fxpFilter[destSize >> 1] += toFixedPoint(1.0 - filterTotal);

        //
        // Now pack filter to useable form
        //
        // 1. Trim heading and tailing zero values, and compensate shitf/length
        // 2. Put all to single array in this format:
        //
        //    [ pos shift, data length, value1, value2, value3, ... ]
        //

        leftNotEmpty = 0;
        while (leftNotEmpty < fxpFilter.length && fxpFilter[leftNotEmpty] === 0) {
            leftNotEmpty++;
        }

        if (leftNotEmpty < fxpFilter.length) {
            rightNotEmpty = fxpFilter.length - 1;
            while (rightNotEmpty > 0 && fxpFilter[rightNotEmpty] === 0) {
                rightNotEmpty--;
            }

            filterShift = srcFirst + leftNotEmpty;
            filterSize = rightNotEmpty - leftNotEmpty + 1;

            packedFilter[packedFilterPtr++] = filterShift; // shift
            packedFilter[packedFilterPtr++] = filterSize; // size

            if (!slowCopy) {
                packedFilter.set(fxpFilter.subarray(leftNotEmpty, rightNotEmpty + 1), packedFilterPtr);
                packedFilterPtr += filterSize;
            } else {
                // fallback for old IE < 11, without subarray/set methods
                for (idx = leftNotEmpty; idx <= rightNotEmpty; idx++) {
                    packedFilter[packedFilterPtr++] = fxpFilter[idx];
                }
            }
        } else {
            // zero data, write header only
            packedFilter[packedFilterPtr++] = 0; // shift
            packedFilter[packedFilterPtr++] = 0; // size
        }
    }
    return packedFilter;
};