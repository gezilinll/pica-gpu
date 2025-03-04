<script setup lang="ts">
import { ref } from 'vue'
import { resizeGL as resize } from 'pica-gpu'
import Pica from 'pica'

const imageUrl = ref<string | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const picaCanvasRef = ref<HTMLCanvasElement | null>(null)
const pica = new Pica()
const currentFilter = ref<'box' | 'hamming' | 'lanczos2'  | 'lanczos3' | 'mks2013'>('mks2013')
const sourceCanvas = ref<HTMLCanvasElement | null>(null)
const originalFileName = ref<string>('')

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    // 保存原始文件名（不包含扩展名）
    originalFileName.value = input.files[0].name.replace(/\.[^/.]+$/, '')
    const reader = new FileReader()
    reader.onload = async (e) => {
      imageUrl.value = e.target?.result as string
      const img = new Image()
      img.onload = async () => {
        // 创建临时 canvas
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) return

        // 设置临时 canvas 尺寸为原始图片尺寸
        tempCanvas.width = img.width
        tempCanvas.height = img.height
        tempCtx.drawImage(img, 0, 0)

        // 保存源图片 canvas
        sourceCanvas.value = tempCanvas

        // 处理图片
        await processImage()
      }
      img.src = imageUrl.value
    }
    reader.readAsDataURL(input.files[0])
  }
}

const processImage = async () => {
  if (!sourceCanvas.value) return

  const tempCanvas = sourceCanvas.value
  const img = tempCanvas.getContext('2d')?.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  if (!img) return

  // 计算目标尺寸
  const targetWidth = 480
  const targetHeight = Math.round(targetWidth * tempCanvas.height / tempCanvas.width)

  try {
    const pixelData = resize(tempCanvas, {
      filter: currentFilter.value,
      targetWidth,
      targetHeight
    })

    // 左侧画布：将处理后的像素数据绘制到页面 canvas
    const canvas = canvasRef.value
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = targetWidth
    canvas.height = targetHeight

    // 创建 ImageData 并绘制
    const imageData = new ImageData(
      new Uint8ClampedArray(pixelData),
      targetWidth,
      targetHeight
    )
    ctx.putImageData(imageData, 0, 0)
  } catch (error) {
    console.error('WebGL 2.0 resize failed:', error)
    // 如果 WebGL 2.0 失败，可以在这里添加回退逻辑
  }

  // 右侧画布：使用 pica 处理
  const picaCanvas = picaCanvasRef.value
  if (!picaCanvas) return

  picaCanvas.width = targetWidth
  picaCanvas.height = targetHeight

  // 使用 pica 进行缩放
  await pica.resize(tempCanvas, picaCanvas, {
    filter: currentFilter.value
  })
}

const handleCanvasClick = () => {
  // 触发文件选择
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (event) => {
    handleImageUpload(event)
  }
  input.click()
}

const applyFilter = (filter: 'hamming' | 'lanczos2' | 'box' | 'lanczos3' | 'mks2013') => {
  currentFilter.value = filter
  // 如果已经有图片，重新处理图片
  if (sourceCanvas.value) {
    processImage()
  }
}

const downloadImages = () => {
  if (!canvasRef.value || !picaCanvasRef.value || !originalFileName.value) return

  // 下载 GPU 版本
  const gpuLink = document.createElement('a')
  gpuLink.download = `${originalFileName.value}_gpu.png`
  gpuLink.href = canvasRef.value.toDataURL('image/png')
  gpuLink.click()

  // 下载 CPU 版本
  const cpuLink = document.createElement('a')
  cpuLink.download = `${originalFileName.value}_cpu.png`
  cpuLink.href = picaCanvasRef.value.toDataURL('image/png')
  cpuLink.click()
}
</script>

<template>
  <div class="container">
    <div class="content">
      <div v-if="!imageUrl" class="upload-section">
        <label class="upload-button">
          Upload Image
          <input
            type="file"
            accept="image/*"
            @change="handleImageUpload"
            class="hidden"
          />
        </label>
      </div>
      
      <div v-else class="image-section">
        <div class="filter-section">
          <span class="filter-label">Resize Filter:</span>
          <button 
            class="filter-button" 
            :class="{ 'filter-button-active': currentFilter === 'box' }"
            @click="applyFilter('box')"
          >
            Box
          </button>
          <button 
            class="filter-button" 
            :class="{ 'filter-button-active': currentFilter === 'hamming' }"
            @click="applyFilter('hamming')"
          >
            Hamming
          </button>
          <button 
            class="filter-button" 
            :class="{ 'filter-button-active': currentFilter === 'lanczos2' }"
            @click="applyFilter('lanczos2')"
          >
            Lanczos2
          </button>
          <button 
            class="filter-button" 
            :class="{ 'filter-button-active': currentFilter === 'lanczos3' }"
            @click="applyFilter('lanczos3')"
          >
            Lanczos3
          </button>
          <button 
            class="filter-button" 
            :class="{ 'filter-button-active': currentFilter === 'mks2013' }"
            @click="applyFilter('mks2013')"
          >
            MKS2013
          </button>
          <button 
            class="download-button"
            @click="downloadImages"
          >
            下载图片
          </button>
        </div>
        <div class="canvas-section">
          <div class="canvas-item">
            <p class="canvas-label">Pica-GPU</p>
            <canvas ref="canvasRef" class="preview-canvas" @click="handleCanvasClick"></canvas>
          </div>
          <div class="canvas-item">
            <p class="canvas-label">Pica</p>
            <canvas ref="picaCanvasRef" class="preview-canvas" @click="handleCanvasClick"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'JetBrains Mono', monospace;
  background-color: #f3f4f6;
  color: #333333;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  width: 100%;
  max-width: 1400px;
  padding: 2rem;
}

.content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 2rem;
}

.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  min-height: 300px;
  justify-content: center;
}

.upload-button {
  background-color: #ffffff;
  color: #2563eb;
  padding: 1rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 2px dashed #2563eb;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upload-button:hover {
  background-color: #f0f7ff;
  transform: translateY(-1px);
}

.hidden {
  display: none;
}

.image-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-label {
  font-size: 0.9rem;
  color: #666666;
}

.filter-button {
  background-color: #ffffff;
  color: #2563eb;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 2px dashed #2563eb;
}

.filter-button:hover {
  background-color: #f0f7ff;
  transform: translateY(-1px);
}

.filter-button-active {
  background-color: #2563eb;
  color: #ffffff;
  border-style: solid;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.filter-button-active:hover {
  background-color: #1d4ed8;
  transform: translateY(-1px);
}

.canvas-section {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.canvas-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.canvas-label {
  font-size: 0.9rem;
  color: #666666;
}

.preview-canvas {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 -4px 6px rgba(0, 0, 0, 0.1);
  background-color: #f8fafc;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.preview-canvas:hover {
  transform: scale(1.02);
}

.download-button {
  background-color: #10b981;
  color: #ffffff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
  margin-left: auto;
}

.download-button:hover {
  background-color: #059669;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
}
</style> 