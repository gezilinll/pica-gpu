import { createDefaultQuadBuffer, createEmptyTexture, createFramebuffer, createProgram, createTextureFromImage, useDefaultQuadBuffer } from "./gl-helper";

const vsSource =
    `#version 300 es
 precision highp float;
 in vec2 a_position;
 in vec2 a_texCoord;
 out vec2 v_texCoord;
 void main(){
   v_texCoord = a_texCoord;
   gl_Position = vec4(a_position, 0.0, 1.0);
 }
 `;

const fsHorizontal =
    `#version 300 es
 precision highp float;
 in vec2 v_texCoord;
 out vec4 outColor;

 uniform sampler2D u_image;
 uniform float u_textureWidth;
 uniform float u_scale;
 uniform float u_radius;

 const float PI = 3.141592653589793;

 float lanczos2Filter(float x) {
   x = abs(x);
   if(x >= 2.0) return 0.0;
   if(x < 1.19209290E-7) return 1.0;
   float xpi = x * PI;
   return (sin(xpi) / xpi) * (sin(xpi / 2.0) / (xpi / 2.0));
 }

 void main(){
   float srcX = (v_texCoord.x * u_textureWidth);
   float left = srcX - u_radius;
   float right = srcX + u_radius;
   int start = int(floor(left));
   int end   = int(ceil(right));
   
   float sum = 0.0;
   vec4 color = vec4(0.0);
   for(int i = start; i <= end; i++){
     float weight = lanczos2Filter(((float(i) + 0.5) - srcX) * u_scale);
     float texX = (float(i) + 0.5) / u_textureWidth;
     vec4 sampleValue = texture(u_image, vec2(texX, v_texCoord.y));
     color += sampleValue * weight;
     sum += weight;
   }
   outColor = color / sum;
 }
 `;

const fsVertical = `#version 300 es
 precision mediump float;
 in vec2 v_texCoord;
 out vec4 outColor;

 uniform sampler2D u_image;
 uniform float u_textureWidth;
 uniform float u_textureHeight;
 uniform float u_scale;
 uniform float u_radius;

 const float PI = 3.141592653589793;

 float lanczos2Filter(float x) {
   x = abs(x);
   if(x >= 2.0) return 0.0;
   if(x < 1.19209290E-7) return 1.0;
   float xpi = x * PI;
   return (sin(xpi) / xpi) * (sin(xpi / 2.0) / (xpi / 2.0));
 }

 void main(){
   float srcY = (v_texCoord.y * u_textureHeight);
   float top = srcY - u_radius;
   float bottom = srcY + u_radius;
   int start = int(floor(top));
   int end   = int(ceil(bottom));
   
   float sum = 0.0;
   vec4 color = vec4(0.0);
   for(int j = start; j <= end; j++){
     float weight = lanczos2Filter(((float(j) + 0.5) - srcY) * u_scale);
     float texY = (float(j) + 0.5) / u_textureHeight;
     vec4 sampleValue = texture(u_image, vec2(v_texCoord.x, texY));
     color += sampleValue * weight;
     sum += weight;
   }
   outColor = color / sum;
 }
 `;

export function resizeGL(source: HTMLCanvasElement, targetWidth: number, targetHeight: number) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2')!;

    const sourceTexture = createTextureFromImage(gl, source);
    const srcWidth = source.width;
    const srcHeight = source.height;
    const scaleX = targetWidth / srcWidth;
    const scaleY = targetHeight / srcHeight;
    const baseRadius = 2;
    const radiusX = (scaleX < 1.0) ? baseRadius / scaleX : baseRadius;
    const radiusY = (scaleY < 1.0) ? baseRadius / scaleY : baseRadius;

    const quadBuffer = createDefaultQuadBuffer(gl);

    const horizontalTexture = createEmptyTexture(gl, targetWidth, srcHeight);
    const horizontalFramebuffer = createFramebuffer(gl, horizontalTexture);
    const horizontalProgram = createProgram(gl, vsSource, fsHorizontal)!;
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

    const verticalTexture = createEmptyTexture(gl, targetWidth, targetHeight);
    const verticalFramebuffer = createFramebuffer(gl, verticalTexture);
    const verticalProgram = createProgram(gl, vsSource, fsVertical)!;
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, verticalFramebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const pixels = new Uint8Array(targetWidth * targetHeight * 4);
    gl.readPixels(0, 0, targetWidth, targetHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
}