<script setup lang="ts">
import { ref } from 'vue'
import { add } from 'pica-gpu'

const imageUrl = ref<string | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// 测试 add 方法
console.log('1 + 2 =', add(1, 2))

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageUrl.value = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.value
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const targetWidth = 540
        const scale = targetWidth / img.width
        const targetHeight = img.height * scale

        canvas.width = targetWidth
        canvas.height = targetHeight
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      }
      img.src = imageUrl.value
    }
    reader.readAsDataURL(input.files[0])
  }
}

const applyFilter = (filter: 'hamming' | 'lanczos2') => {
  // TODO: 实现滤镜效果
  console.log('Applying filter:', filter)
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
          <button class="filter-button" @click="applyFilter('hamming')">Hamming</button>
          <button class="filter-button" @click="applyFilter('lanczos2')">Lanczos2</button>
        </div>
        <canvas ref="canvasRef" class="preview-canvas"></canvas>
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
  background-color: #ffffff;
  color: #333333;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  width: 100%;
  max-width: 1200px;
  padding: 2rem;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.upload-section, .image-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.upload-button {
  background-color: #ffffff;
  color: #2563eb;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 2px solid #2563eb;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.upload-button:hover {
  background-color: #2563eb;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}

.hidden {
  display: none;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-label {
  color: #666666;
  font-size: 0.9rem;
}

.filter-button {
  background-color: #ffffff;
  color: #2563eb;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 2px solid #2563eb;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.filter-button:hover {
  background-color: #2563eb;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}

.preview-canvas {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 -4px 6px rgba(0, 0, 0, 0.1);
  background-color: #f8fafc;
}
</style> 