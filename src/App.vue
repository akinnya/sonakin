<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { SoundOutlined, CloudUploadOutlined, SwapOutlined, DownloadOutlined, DeleteOutlined, LockOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons-vue'
import { convertAudio, loadFFmpeg, FORMATS, type AudioFormat } from './utils/converter'
import { decryptNcm } from './utils/ncm'

interface FileInfo {
  duration?: string
  bitrate?: string
  sampleRate?: string
}

interface FileItem {
  id: string
  file: File
  name: string
  size: string
  status: 'waiting' | 'converting' | 'done' | 'error'
  progress: string
  result?: { blob: Blob; filename: string }
  isNcm: boolean
  isVideo: boolean
  previewUrl?: string
  playing?: boolean
  info?: FileInfo
}

const lang = ref<'zh' | 'en'>('zh')

const t = computed(() => ({
  subtitle: lang.value === 'zh' ? '浏览器端音频格式转换 · 文件不离开你的设备' : 'Browser-based audio converter · Files never leave your device',
  uploadText: lang.value === 'zh' ? '拖拽文件到这里，或点击选择文件' : 'Drop files here, or click to select',
  uploadHint: lang.value === 'zh' ? '支持音频/视频 · MP3 / WAV / FLAC / OGG / AAC / MP4 / NCM 等' : 'Supports audio/video · MP3 / WAV / FLAC / OGG / AAC / MP4 / NCM etc.',
  targetFormat: lang.value === 'zh' ? '目标格式：' : 'Target format:',
  bitrate: lang.value === 'zh' ? '比特率：' : 'Bitrate:',
  sampleRate: lang.value === 'zh' ? '采样率：' : 'Sample rate:',
  ncmTip: lang.value === 'zh' ? 'NCM 文件将自动解密为原始格式' : 'NCM files will be decrypted to their original format',
  videoTip: lang.value === 'zh' ? '视频文件将提取其中的音频' : 'Audio will be extracted from video files',
  convertBtn: lang.value === 'zh' ? '开始转换' : 'Convert',
  loadingEngine: lang.value === 'zh' ? '加载引擎中...' : 'Loading engine...',
  converting: lang.value === 'zh' ? '转换中...' : 'Converting...',
  downloadAll: lang.value === 'zh' ? '全部下载' : 'Download all',
  clearAll: lang.value === 'zh' ? '清空列表' : 'Clear all',
  done: lang.value === 'zh' ? '完成' : 'Done',
  failed: lang.value === 'zh' ? '转换失败' : 'Failed',
  convertDone: lang.value === 'zh' ? '转换完成' : 'Conversion complete',
  footer: lang.value === 'zh' ? '纯前端音频转换 · 开源于' : 'Browser-based audio converter · Open source on',
  autoLabel: lang.value === 'zh' ? '自动' : 'Auto',
  download: lang.value === 'zh' ? '下载' : 'Download',
}))

const files = ref<FileItem[]>([])
const targetFormat = ref<AudioFormat>('mp3')
const ffmpegLoaded = ref(false)
const ffmpegLoading = ref(false)
const converting = ref(false)
const dragOver = ref(false)
const targetBitrate = ref<string>('auto')
const targetSampleRate = ref<string>('auto')

const ACCEPT = '.mp3,.wav,.flac,.ogg,.aac,.m4a,.wma,.ncm,.mp4,.mkv,.avi,.mov,.webm,.flv'
const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv']

const BITRATES = [
  { label: t.value.autoLabel, value: 'auto' },
  { label: '64 kbps', value: '64k' },
  { label: '128 kbps', value: '128k' },
  { label: '192 kbps', value: '192k' },
  { label: '256 kbps', value: '256k' },
  { label: '320 kbps', value: '320k' },
]

const SAMPLE_RATES = [
  { label: t.value.autoLabel, value: 'auto' },
  { label: '22050 Hz', value: '22050' },
  { label: '44100 Hz', value: '44100' },
  { label: '48000 Hz', value: '48000' },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function addFiles(inputFiles: FileList | File[]) {
  for (const file of inputFiles) {
    const ext = getExt(file.name)
    const isVideo = VIDEO_EXTS.includes(ext)
    const isNcm = ext === 'ncm'
    const previewUrl = (isVideo || isNcm) ? undefined : URL.createObjectURL(file)
    files.value.push({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      size: formatSize(file.size),
      status: 'waiting',
      progress: '',
      isNcm,
      isVideo,
      previewUrl,
      playing: false,
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
  const item = files.value.find(f => f.id === id)
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
  files.value = files.value.filter((f) => f.id !== id)
}

function clearAll() {
  files.value.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
  files.value = []
}

const currentAudio = ref<HTMLAudioElement | null>(null)
const currentPlayingId = ref<string | null>(null)

function togglePlay(item: FileItem) {
  if (!item.previewUrl && !item.result) return
  const url = item.result ? URL.createObjectURL(item.result.blob) : item.previewUrl!
  if (currentPlayingId.value === item.id && currentAudio.value) {
    if (currentAudio.value.paused) {
      currentAudio.value.play()
      item.playing = true
    } else {
      currentAudio.value.pause()
      item.playing = false
    }
    return
  }
  if (currentAudio.value) {
    currentAudio.value.pause()
    const prev = files.value.find(f => f.id === currentPlayingId.value)
    if (prev) prev.playing = false
  }
  const audio = new Audio(url)
  audio.onended = () => { item.playing = false }
  audio.play()
  item.playing = true
  currentAudio.value = audio
  currentPlayingId.value = item.id
}

async function startConvert() {
  if (files.value.length === 0) return
  converting.value = true

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
    item.progress = t.value.converting
    try {
      if (item.isNcm) {
        item.progress = lang.value === 'zh' ? '解密中...' : 'Decrypting...'
        const result = await decryptNcm(item.file)
        item.result = { blob: result.blob, filename: result.filename }
      } else {
        const result = await convertAudio(
          item.file,
          targetFormat.value,
          (msg) => { item.progress = msg },
          targetBitrate.value === 'auto' ? undefined : targetBitrate.value,
          targetSampleRate.value === 'auto' ? undefined : targetSampleRate.value,
        )
        item.result = result
      }
      item.status = 'done'
      item.progress = t.value.done
    } catch (e: any) {
      item.status = 'error'
      item.progress = e.message || t.value.failed
    }
  }
  converting.value = false
  message.success(t.value.convertDone)
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
      <div class="header-top">
        <div class="logo">
          <SoundOutlined class="logo-icon" />
          <span class="logo-text">Son<span class="logo-highlight">akin</span></span>
        </div>
        <a-button size="small" @click="lang = lang === 'zh' ? 'en' : 'zh'">{{ lang === 'zh' ? 'EN' : '中文' }}</a-button>
      </div>
      <p class="subtitle">{{ t.subtitle }}</p>
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
        <p class="upload-text">{{ t.uploadText }}</p>
        <p class="upload-hint">{{ t.uploadHint }}</p>
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
          <span class="label"><SwapOutlined /> {{ t.targetFormat }}</span>
          <a-radio-group v-model:value="targetFormat" button-style="solid" size="large">
            <a-radio-button v-for="f in FORMATS" :key="f.value" :value="f.value">
              {{ f.label }}
            </a-radio-button>
          </a-radio-group>
        </div>
        <div class="format-select" style="margin-top:12px">
          <span class="label">{{ t.bitrate }}</span>
          <a-select v-model:value="targetBitrate" size="small" style="width:130px">
            <a-select-option v-for="b in BITRATES" :key="b.value" :value="b.value">{{ b.label }}</a-select-option>
          </a-select>
          <span class="label" style="margin-left:16px">{{ t.sampleRate }}</span>
          <a-select v-model:value="targetSampleRate" size="small" style="width:130px">
            <a-select-option v-for="s in SAMPLE_RATES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </div>
        <p class="ncm-tip" v-if="files.some((f) => f.isNcm)">
          <LockOutlined /> {{ t.ncmTip }}
        </p>
        <p class="ncm-tip" v-if="files.some((f) => f.isVideo)" style="color:#2563eb">
          {{ t.videoTip }}
        </p>
      </div>

      <!-- 文件列表 -->
      <div class="file-list" v-if="files.length > 0">
        <div v-for="item in files" :key="item.id" class="file-item" :class="item.status">
          <div class="file-info">
            <span class="file-name">{{ item.status === 'done' && item.result ? item.result.filename : item.name }}</span>
            <span class="file-size">{{ item.size }}</span>
            <span v-if="item.isNcm" class="ncm-badge">NCM</span>
            <span v-if="item.isVideo" class="ncm-badge" style="background:#2563eb;color:#fff">VIDEO</span>
          </div>
          <div class="file-actions">
            <a-button
              v-if="!item.isNcm && !item.isVideo && item.previewUrl"
              type="text"
              size="small"
              @click.stop="togglePlay(item)"
            >
              <PlayCircleOutlined v-if="!item.playing" />
              <PauseCircleOutlined v-else />
            </a-button>
            <span class="file-status" v-if="item.status !== 'waiting'">{{ item.progress }}</span>
            <a-button
              v-if="item.status === 'done'"
              type="link"
              size="small"
              @click="downloadFile(item)"
            >
              <DownloadOutlined /> {{ t.download }}
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
          {{ ffmpegLoading ? t.loadingEngine : converting ? t.converting : t.convertBtn }}
        </a-button>
        <a-button size="large" @click="downloadAll" :disabled="doneCount === 0">
          {{ t.downloadAll }} ({{ doneCount }})
        </a-button>
        <a-button size="large" @click="clearAll" :disabled="converting">{{ t.clearAll }}</a-button>
      </div>
    </main>

    <footer>
      <p>Sonakin · {{ t.footer }} <a href="https://github.com/akinnya/sonakin" target="_blank">GitHub</a></p>
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

.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 12px;
}

.header-top .ant-btn {
  position: absolute;
  right: 0;
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
  color: #2563eb;
}

.logo-text {
  font-size: 36px;
  font-weight: 700;
  color: #1e3a5f;
  letter-spacing: -0.5px;
}

.logo-highlight {
  color: #2563eb;
}

.subtitle {
  color: #64748b;
  font-size: 15px;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-zone {
  border: 2px dashed #93c5fd;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(37, 99, 235, 0.04);
}

.upload-zone:hover,
.upload-zone.drag-over {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
}

.upload-icon {
  font-size: 48px;
  color: #2563eb;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #334155;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 13px;
  color: #64748b;
}

.settings {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(37,99,235,0.08);
}

.format-select {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.label {
  color: #334155;
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
  background: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(37,99,235,0.06);
}

.file-item.done {
  border-left: 3px solid #10b981;
}

.file-item.error {
  border-left: 3px solid #ef4444;
}

.file-item.converting {
  border-left: 3px solid #2563eb;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.file-name {
  color: #1e3a5f;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #64748b;
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
  color: #64748b;
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
  border-top: 1px solid #bfdbfe;
  color: #64748b;
  font-size: 13px;
}

footer a {
  color: #2563eb;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}
</style>
