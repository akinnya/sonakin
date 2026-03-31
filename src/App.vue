<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { SoundOutlined, CloudUploadOutlined, SwapOutlined, DownloadOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons-vue'
import { convertAudio, loadFFmpeg, FORMATS, type AudioFormat } from './utils/converter'
import { decryptNcm } from './utils/ncm'

interface FileItem {
  id: string
  file: File
  name: string
  size: string
  status: 'waiting' | 'converting' | 'done' | 'error'
  progress: string
  result?: { blob: Blob; filename: string }
  isNcm: boolean
}

const files = ref<FileItem[]>([])
const targetFormat = ref<AudioFormat>('mp3')
const ffmpegLoaded = ref(false)
const ffmpegLoading = ref(false)
const converting = ref(false)
const dragOver = ref(false)

const ACCEPT = '.mp3,.wav,.flac,.ogg,.aac,.m4a,.wma,.ncm'

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function addFiles(inputFiles: FileList | File[]) {
  for (const file of inputFiles) {
    files.value.push({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      size: formatSize(file.size),
      status: 'waiting',
      progress: '',
      isNcm: file.name.toLowerCase().endsWith('.ncm'),
    })
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  input.value = ''
}

function removeFile(id: string) {
  files.value = files.value.filter((f) => f.id !== id)
}

function clearAll() {
  files.value = []
}

async function startConvert() {
  if (files.value.length === 0) return
  converting.value = true

  // 先加载 ffmpeg（非 ncm 文件需要）
  const hasNonNcm = files.value.some((f) => !f.isNcm)
  if (hasNonNcm && !ffmpegLoaded.value) {
    ffmpegLoading.value = true
    try {
      await loadFFmpeg()
      ffmpegLoaded.value = true
    } catch (e) {
      message.error('FFmpeg 加载失败，请刷新重试')
      converting.value = false
      ffmpegLoading.value = false
      return
    }
    ffmpegLoading.value = false
  }

  for (const item of files.value) {
    if (item.status === 'done') continue
    item.status = 'converting'
    item.progress = '转换中...'
    try {
      if (item.isNcm) {
        item.progress = '解密中...'
        const result = await decryptNcm(item.file)
        item.result = { blob: result.blob, filename: result.filename }
      } else {
        const result = await convertAudio(item.file, targetFormat.value, (msg) => {
          item.progress = msg
        })
        item.result = result
      }
      item.status = 'done'
      item.progress = '完成'
    } catch (e: any) {
      item.status = 'error'
      item.progress = e.message || '转换失败'
    }
  }
  converting.value = false
  message.success('转换完成')
}

function downloadFile(item: FileItem) {
  if (!item.result) return
  const url = URL.createObjectURL(item.result.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = item.result.filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadAll() {
  files.value.filter((f) => f.status === 'done').forEach(downloadFile)
}

const doneCount = computed(() => files.value.filter((f) => f.status === 'done').length)
</script>

<template>
  <div class="container">
    <header>
      <div class="logo">
        <SoundOutlined class="logo-icon" />
        <span class="logo-text">Son<span class="logo-highlight">akin</span></span>
      </div>
      <p class="subtitle">浏览器端音频格式转换 · 文件不离开你的设备</p>
    </header>

    <main>
      <!-- 上传区域 -->
      <div
        class="upload-zone"
        :class="{ 'drag-over': dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
        @click="($refs.fileInput as HTMLInputElement).click()"
      >
        <CloudUploadOutlined class="upload-icon" />
        <p class="upload-text">拖拽文件到这里，或点击选择文件</p>
        <p class="upload-hint">支持 MP3 / WAV / FLAC / OGG / AAC / NCM</p>
        <input
          ref="fileInput"
          type="file"
          :accept="ACCEPT"
          multiple
          hidden
          @change="onFileInput"
        />
      </div>

      <!-- 转换设置 -->
      <div class="settings" v-if="files.length > 0">
        <div class="format-select">
          <span class="label"><SwapOutlined /> 目标格式：</span>
          <a-radio-group v-model:value="targetFormat" button-style="solid" size="large">
            <a-radio-button v-for="f in FORMATS" :key="f.value" :value="f.value">
              {{ f.label }}
            </a-radio-button>
          </a-radio-group>
        </div>
        <p class="ncm-tip" v-if="files.some((f) => f.isNcm)">
          <LockOutlined /> NCM 文件将自动解密为原始格式
        </p>
      </div>

      <!-- 文件列表 -->
      <div class="file-list" v-if="files.length > 0">
        <div v-for="item in files" :key="item.id" class="file-item" :class="item.status">
          <div class="file-info">
            <span class="file-name">{{ item.name }}</span>
            <span class="file-size">{{ item.size }}</span>
            <span v-if="item.isNcm" class="ncm-badge">NCM</span>
          </div>
          <div class="file-actions">
            <span class="file-status" v-if="item.status !== 'waiting'">{{ item.progress }}</span>
            <a-button
              v-if="item.status === 'done'"
              type="link"
              size="small"
              @click="downloadFile(item)"
            >
              <DownloadOutlined /> 下载
            </a-button>
            <a-button
              type="text"
              size="small"
              danger
              @click="removeFile(item.id)"
              :disabled="item.status === 'converting'"
            >
              <DeleteOutlined />
            </a-button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions" v-if="files.length > 0">
        <a-button
          type="primary"
          size="large"
          :loading="converting || ffmpegLoading"
          @click="startConvert"
        >
          {{ ffmpegLoading ? '加载引擎中...' : converting ? '转换中...' : '开始转换' }}
        </a-button>
        <a-button size="large" @click="downloadAll" :disabled="doneCount === 0">
          全部下载 ({{ doneCount }})
        </a-button>
        <a-button size="large" @click="clearAll" :disabled="converting">清空列表</a-button>
      </div>
    </main>

    <footer>
      <p>Sonakin · 纯前端音频转换 · 开源于 <a href="https://github.com/akinnya/sonakin" target="_blank">GitHub</a></p>
    </footer>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.logo-icon {
  font-size: 36px;
  color: #7c5cfc;
}

.logo-text {
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
}

.logo-highlight {
  color: #7c5cfc;
}

.subtitle {
  color: #9ca3af;
  font-size: 15px;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-zone {
  border: 2px dashed #4a4560;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(124, 92, 252, 0.04);
}

.upload-zone:hover,
.upload-zone.drag-over {
  border-color: #7c5cfc;
  background: rgba(124, 92, 252, 0.1);
}

.upload-icon {
  font-size: 48px;
  color: #7c5cfc;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #d1d5db;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 13px;
  color: #6b7280;
}

.settings {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px 24px;
}

.format-select {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.label {
  color: #d1d5db;
  font-size: 15px;
  white-space: nowrap;
}

.ncm-tip {
  margin-top: 12px;
  color: #f59e0b;
  font-size: 13px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 16px;
  transition: all 0.3s;
}

.file-item.done {
  border-left: 3px solid #10b981;
}

.file-item.error {
  border-left: 3px solid #ef4444;
}

.file-item.converting {
  border-left: 3px solid #7c5cfc;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.file-name {
  color: #e5e7eb;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #6b7280;
  font-size: 12px;
  flex-shrink: 0;
}

.ncm-badge {
  background: #f59e0b;
  color: #000;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.file-status {
  color: #9ca3af;
  font-size: 12px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

footer {
  text-align: center;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #6b7280;
  font-size: 13px;
}

footer a {
  color: #7c5cfc;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}
</style>
