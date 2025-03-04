import { ResizeOptions } from "../definition";
import { createDefaultQuadBuffer, createEmptyTexture, createFramebuffer, createProgram, createTextureFromImage, useDefaultQuadBuffer } from "./gl-helper";
import { generateHorizontalShader, generateVerticalShader, getResizeWindow, vsSource } from "./shaders";

export function resizeGL(source: HTMLCanvasElement, options: ResizeOptions) {
    const canvas = options.drawToCanvas ?? document.createElement('canvas');
    const gl = canvas.getContext('webgl2')!;
    const targetWidth = Math.round(options.targetWidth);
    const targetHeight = Math.round(options.targetHeight);

    const sourceTexture = createTextureFromImage(gl, source);
    const srcWidth = source.width;
    const srcHeight = source.height;
    const scaleX = targetWidth / srcWidth;
    const scaleY = targetHeight / srcHeight;
    const baseRadius = getResizeWindow(options.filter);
    const radiusX = (scaleX < 1.0) ? baseRadius / scaleX : baseRadius;
    const radiusY = (scaleY < 1.0) ? baseRadius / scaleY : baseRadius;

    const quadBuffer = createDefaultQuadBuffer(gl);

    const horizontalTexture = createEmptyTexture(gl, targetWidth, srcHeight);
    const horizontalFramebuffer = createFramebuffer(gl, horizontalTexture);
    const compiledHorizontal = createProgram(gl, vsSource, generateHorizontalShader(options.filter))!;
    const horizontalProgram = compiledHorizontal.program;
    gl.useProgram(horizontalProgram);
    useDefaultQuadBuffer(gl, horizontalProgram, quadBuffer, "a_position", "a_texCoord");
    gl.uniform1i(gl.getUniformLocation(horizontalProgram, "u_image"), 0);
    gl.uniform1f(gl.getUniformLocation(horizontalProgram, "u_textureWidth"), srcWidth);
    gl.uniform1f(gl.getUniformLocation(horizontalProgram, "u_scale"), scaleX);
    gl.uniform1f(gl.getUniformLocation(horizontalProgram, "u_radius"), radiusX);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.viewport(0, 0, targetWidth, srcHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, horizontalFramebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const compiledVertical = createProgram(gl, vsSource, generateVerticalShader(options.filter))!;
    const verticalProgram = compiledVertical.program;
    gl.useProgram(verticalProgram);
    useDefaultQuadBuffer(gl, verticalProgram, quadBuffer, "a_position", "a_texCoord");
    gl.uniform1i(gl.getUniformLocation(verticalProgram, "u_image"), 0);
    gl.uniform1f(gl.getUniformLocation(verticalProgram, "u_textureWidth"), targetWidth);
    gl.uniform1f(gl.getUniformLocation(verticalProgram, "u_textureHeight"), srcHeight);
    gl.uniform1f(gl.getUniformLocation(verticalProgram, "u_scale"), scaleY);
    gl.uniform1f(gl.getUniformLocation(verticalProgram, "u_radius"), radiusY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, horizontalTexture);
    gl.viewport(0, 0, targetWidth, targetHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.deleteTexture(sourceTexture);
    gl.deleteTexture(horizontalTexture);
    gl.deleteProgram(compiledHorizontal.program);
    gl.deleteProgram(compiledVertical.program);
    gl.deleteShader(compiledHorizontal.vertexShader);
    gl.deleteShader(compiledHorizontal.fragmentShader);
    gl.deleteShader(compiledVertical.vertexShader);
    gl.deleteShader(compiledVertical.fragmentShader);
    gl.deleteFramebuffer(horizontalFramebuffer);
    gl.deleteBuffer(quadBuffer);

    return canvas;
}