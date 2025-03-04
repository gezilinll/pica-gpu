import { createFilters } from "./create-filter";

export interface ResizeOptions {
    targetWidth: number;
    targetHeight: number;
    filter: 'hamming' | 'lanczos2';
}

// 顶点着色器
const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0, 1);
  v_texCoord = a_texCoord;
}`;

// 片段着色器
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_texelSize;
uniform float u_filter[256];
uniform int u_filterSize;
uniform int u_filterShift;
uniform bool u_isHorizontal;
in vec2 v_texCoord;
layout(location = 0) out vec4 fragColor;

void main() {
  vec4 color = vec4(0.0);
  float sum = 0.0;
  
  // 计算当前像素在目标图像中的位置
  vec2 pixelCoord = v_texCoord * u_resolution;
  
  // 根据方向选择采样偏移
  vec2 offset = u_isHorizontal ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  
  // 计算当前处理的目标像素位置
  float targetPos = u_isHorizontal ? pixelCoord.x : pixelCoord.y;
  
  // 计算起始采样点
  vec2 startCoord = v_texCoord + offset * float(u_filterShift) * u_texelSize;
  
  // 应用滤波器
  for (int i = 0; i < 256; i++) {
    if (i >= u_filterSize) break;
    
    // 计算采样坐标
    vec2 coord = startCoord + offset * float(i) * u_texelSize;
    
    // 确保坐标在有效范围内
    coord = clamp(coord, vec2(0.0), vec2(1.0));
    
    // 采样纹理
    vec4 texColor = texture(u_image, coord);
    
    // 应用滤波器权重
    float filterVal = u_filter[i];
    color += texColor * filterVal;
    sum += filterVal;
  }
  
  // 归一化结果
  color = color / sum;
  
  // 确保颜色值在有效范围内
  color = clamp(color, 0.0, 1.0);
  
  fragColor = texture(u_image, v_texCoord);
}`;

let gl2: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let texCoordBuffer: WebGLBuffer | null = null;
let vao: WebGLVertexArrayObject | null = null;

function initWebGL2() {
    if (!gl2) {
        const canvas = document.createElement('canvas');
        gl2 = canvas.getContext('webgl2');
        if (!gl2) return false;

        // 创建着色器程序
        const vertexShader = createShader(gl2, gl2.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = createShader(gl2, gl2.FRAGMENT_SHADER, FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return false;

        program = gl2.createProgram();
        if (!program) return false;

        gl2.attachShader(program, vertexShader);
        gl2.attachShader(program, fragmentShader);
        gl2.linkProgram(program);

        if (!gl2.getProgramParameter(program, gl2.LINK_STATUS)) {
            console.error('程序链接失败:', gl2.getProgramInfoLog(program));
            return false;
        }

        // 创建 VAO
        vao = gl2.createVertexArray();
        gl2.bindVertexArray(vao);

        // 设置顶点缓冲区
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]);
        positionBuffer = gl2.createBuffer();
        gl2.bindBuffer(gl2.ARRAY_BUFFER, positionBuffer);
        gl2.bufferData(gl2.ARRAY_BUFFER, positions, gl2.STATIC_DRAW);

        // 设置纹理坐标缓冲区
        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ]);
        texCoordBuffer = gl2.createBuffer();
        gl2.bindBuffer(gl2.ARRAY_BUFFER, texCoordBuffer);
        gl2.bufferData(gl2.ARRAY_BUFFER, texCoords, gl2.STATIC_DRAW);

        // 设置顶点属性
        const positionLocation = gl2.getAttribLocation(program, 'a_position');
        const texCoordLocation = gl2.getAttribLocation(program, 'a_texCoord');

        gl2.bindBuffer(gl2.ARRAY_BUFFER, positionBuffer);
        gl2.enableVertexAttribArray(positionLocation);
        gl2.vertexAttribPointer(positionLocation, 2, gl2.FLOAT, false, 0, 0);

        gl2.bindBuffer(gl2.ARRAY_BUFFER, texCoordBuffer);
        gl2.enableVertexAttribArray(texCoordLocation);
        gl2.vertexAttribPointer(texCoordLocation, 2, gl2.FLOAT, false, 0, 0);

        gl2.bindVertexArray(null);
        return true;
    }
    return true;
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('着色器编译失败:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

export function resizeGL2(image: HTMLCanvasElement, options: ResizeOptions) {
    if (!initWebGL2() || !gl2 || !program || !vao) {
        throw new Error('WebGL 2.0 初始化失败');
    }

    const srcW = image.width;
    const srcH = image.height;
    const destW = options.targetWidth;
    const destH = options.targetHeight;
    const scaleX = destW / srcW;
    const scaleY = destH / srcH;
    const filter = options.filter;

    // 创建源图像纹理
    const srcTexture = gl2.createTexture();
    gl2.bindTexture(gl2.TEXTURE_2D, srcTexture);
    gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA8, srcW, srcH, 0, gl2.RGBA, gl2.UNSIGNED_BYTE, image);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, gl2.NEAREST);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MAG_FILTER, gl2.NEAREST);

    // 创建中间纹理（用于水平卷积结果）
    const midTexture = gl2.createTexture();
    gl2.bindTexture(gl2.TEXTURE_2D, midTexture);
    gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA8, destW, srcH, 0, gl2.RGBA, gl2.UNSIGNED_BYTE, null);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, gl2.NEAREST);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MAG_FILTER, gl2.NEAREST);

    // 创建目标纹理
    const destTexture = gl2.createTexture();
    gl2.bindTexture(gl2.TEXTURE_2D, destTexture);
    gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA8, destW, destH, 0, gl2.RGBA, gl2.UNSIGNED_BYTE, null);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, gl2.NEAREST);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MAG_FILTER, gl2.NEAREST);

    // 创建帧缓冲区
    const framebuffer = gl2.createFramebuffer();
    gl2.bindFramebuffer(gl2.FRAMEBUFFER, framebuffer);

    // 使用着色器程序
    gl2.useProgram(program);

    // 绑定 VAO
    gl2.bindVertexArray(vao);

    // 设置统一变量
    gl2.uniform1i(gl2.getUniformLocation(program, 'u_image'), 0);
    gl2.uniform2f(gl2.getUniformLocation(program, 'u_resolution'), destW, srcH);
    gl2.uniform2f(gl2.getUniformLocation(program, 'u_texelSize'), 1.0 / srcW, 1.0 / srcH);

    // 水平卷积
    gl2.bindTexture(gl2.TEXTURE_2D, srcTexture);
    gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, midTexture, 0);

    // 检查帧缓冲区状态
    if (gl2.checkFramebufferStatus(gl2.FRAMEBUFFER) !== gl2.FRAMEBUFFER_COMPLETE) {
        throw new Error('帧缓冲区状态错误');
    }

    gl2.viewport(0, 0, destW, srcH);

    const filtersX = createFilters(filter, srcW, destW, scaleX, 0);
    console.log('A', filtersX.length);
    let filterPtr = 0;

    for (let destX = 0; destX < destW; destX++) {
        const filterShift = filtersX[filterPtr++];
        const filterSize = filtersX[filterPtr++];

        const filterArray = new Float32Array(256);
        for (let i = 0; i < filterSize; i++) {
            filterArray[i] = filtersX[filterPtr++] / 32768.0;
        }

        gl2.uniform1fv(gl2.getUniformLocation(program, 'u_filter'), filterArray);
        gl2.uniform1i(gl2.getUniformLocation(program, 'u_filterSize'), filterSize);
        gl2.uniform1i(gl2.getUniformLocation(program, 'u_filterShift'), filterShift);
        gl2.uniform1i(gl2.getUniformLocation(program, 'u_isHorizontal'), 1);

        gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4);
    }

    // 垂直卷积
    gl2.bindTexture(gl2.TEXTURE_2D, midTexture);
    gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, destTexture, 0);

    // 检查帧缓冲区状态
    if (gl2.checkFramebufferStatus(gl2.FRAMEBUFFER) !== gl2.FRAMEBUFFER_COMPLETE) {
        throw new Error('帧缓冲区状态错误');
    }

    gl2.viewport(0, 0, destW, destH);

    const filtersY = createFilters(filter, srcH, destH, scaleY, 0);
    console.log('B', filtersX.length);
    filterPtr = 0;

    for (let destY = 0; destY < destH; destY++) {
        const filterShift = filtersY[filterPtr++];
        const filterSize = filtersY[filterPtr++];

        const filterArray = new Float32Array(256);
        for (let i = 0; i < filterSize; i++) {
            filterArray[i] = filtersY[filterPtr++] / 32768.0;
        }

        gl2.uniform1fv(gl2.getUniformLocation(program, 'u_filter'), filterArray);
        gl2.uniform1i(gl2.getUniformLocation(program, 'u_filterSize'), filterSize);
        gl2.uniform1i(gl2.getUniformLocation(program, 'u_filterShift'), filterShift);
        gl2.uniform1i(gl2.getUniformLocation(program, 'u_isHorizontal'), 0);

        gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4);
    }

    // 读取结果
    const pixels = new Uint8Array(destW * destH * 4);
    gl2.readPixels(0, 0, destW, destH, gl2.RGBA, gl2.UNSIGNED_BYTE, pixels);

    // 清理资源
    gl2.deleteTexture(srcTexture);
    gl2.deleteTexture(midTexture);
    gl2.deleteTexture(destTexture);
    gl2.deleteFramebuffer(framebuffer);

    resetAlpha(pixels, destW, destH);

    return pixels;
}

function resetAlpha(dst: Uint8Array, width: number, height: number) {
    let ptr = 3, len = (width * height * 4) | 0;
    while (ptr < len) { dst[ptr] = 0xFF; ptr = (ptr + 4) | 0; }
}