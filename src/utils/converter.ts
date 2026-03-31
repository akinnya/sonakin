import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

export async function loadFFmpeg(onProgress?: (msg: string) => void) {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg
  ffmpeg = new FFmpeg()
  ffmpeg.on('log', ({ message }) => {
    onProgress?.(message)
  })
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return ffmpeg
}

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac'

export const FORMATS: { label: string; value: AudioFormat }[] = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
  { label: 'FLAC', value: 'flac' },
  { label: 'OGG', value: 'ogg' },
  { label: 'AAC', value: 'aac' },
]

export const BITRATES = [
  { label: '自动 / Auto', value: '' },
  { label: '128 kbps', value: '128k' },
  { label: '192 kbps', value: '192k' },
  { label: '256 kbps', value: '256k' },
  { label: '320 kbps', value: '320k' },
]

export const SAMPLE_RATES = [
  { label: '自动 / Auto', value: '' },
  { label: '22050 Hz', value: '22050' },
  { label: '44100 Hz', value: '44100' },
  { label: '48000 Hz', value: '48000' },
]

export const VIDEO_EXTENSIONS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'm4v', 'wmv', '3gp']

export async function convertAudio(
  file: File,
  targetFormat: AudioFormat,
  onProgress?: (msg: string) => void,
  bitrate?: string,
  sampleRate?: string,
): Promise<{ blob: Blob; filename: string }> {
  const ff = await loadFFmpeg(onProgress)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'tmp'
  const inputName = `input_${Date.now()}.${ext}`
  const baseName = file.name.replace(/\.[^.]+$/, '')

  await ff.writeFile(inputName, await fetchFile(file))

  const extraArgs: string[] = []
  if (bitrate) extraArgs.push('-b:a', bitrate)
  if (sampleRate) extraArgs.push('-ar', sampleRate)

  const codecArgs: string[] = []
  if (targetFormat === 'aac') {
    codecArgs.push('-c:a', 'aac')
    const m4aOutput = `out_${Date.now()}.m4a`
    await ff.exec(['-i', inputName, ...codecArgs, ...extraArgs, m4aOutput])
    const data = await ff.readFile(m4aOutput)
    await ff.deleteFile(inputName)
    await ff.deleteFile(m4aOutput)
    return {
      blob: new Blob([new Uint8Array(data as Uint8Array)], { type: 'audio/aac' }),
      filename: `${baseName}.aac`,
    }
  }

  if (targetFormat === 'mp3') codecArgs.push('-c:a', 'libmp3lame', ...(bitrate ? [] : ['-q:a', '2']))
  if (targetFormat === 'ogg') codecArgs.push('-c:a', 'libvorbis', ...(bitrate ? [] : ['-q:a', '5']))
  if (targetFormat === 'flac') codecArgs.push('-c:a', 'flac')
  if (targetFormat === 'wav') codecArgs.push('-c:a', 'pcm_s16le')

  const outputName = `out_${Date.now()}.${targetFormat}`
  await ff.exec(['-i', inputName, ...codecArgs, ...extraArgs, outputName])
  const data = await ff.readFile(outputName)
  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  const mimeMap: Record<AudioFormat, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
  }

  return {
    blob: new Blob([new Uint8Array(data as Uint8Array)], { type: mimeMap[targetFormat] }),
    filename: `${baseName}.${targetFormat}`,
  }
}
