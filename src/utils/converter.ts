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

const mimeMap: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
}

function buildCodecArgs(targetFormat: AudioFormat, bitrate?: string): string[] {
  if (targetFormat === 'mp3') return ['-c:a', 'libmp3lame', ...(bitrate ? [] : ['-q:a', '2'])]
  if (targetFormat === 'ogg') return ['-c:a', 'libvorbis', ...(bitrate ? [] : ['-q:a', '5'])]
  if (targetFormat === 'flac') return ['-c:a', 'flac']
  if (targetFormat === 'wav') return ['-c:a', 'pcm_s16le']
  if (targetFormat === 'aac') return ['-c:a', 'aac']
  return []
}

export async function convertAudio(
  file: File,
  targetFormat: AudioFormat,
  onProgress?: (msg: string) => void,
  bitrate?: string,
  sampleRate?: string,
  trimStart?: string,
  trimEnd?: string,
  volume?: number,
): Promise<{ blob: Blob; filename: string }> {
  const ff = await loadFFmpeg(onProgress)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'tmp'
  const inputName = `input_${Date.now()}.${ext}`
  const baseName = file.name.replace(/\.[^.]+$/, '')

  await ff.writeFile(inputName, await fetchFile(file))

  const trimArgs: string[] = []
  if (trimStart && parseFloat(trimStart) > 0) trimArgs.push('-ss', trimStart)
  if (trimEnd && parseFloat(trimEnd) > 0) trimArgs.push('-to', trimEnd)

  const extraArgs: string[] = []
  if (bitrate) extraArgs.push('-b:a', bitrate)
  if (sampleRate) extraArgs.push('-ar', sampleRate)
  if (volume && volume !== 1) extraArgs.push('-filter:a', `volume=${volume}`)

  const codecArgs = buildCodecArgs(targetFormat, bitrate)
  const outExt = targetFormat === 'aac' ? 'm4a' : targetFormat
  const outputName = `out_${Date.now()}.${outExt}`

  await ff.exec(['-i', inputName, ...trimArgs, ...codecArgs, ...extraArgs, outputName])
  const data = await ff.readFile(outputName)
  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  return {
    blob: new Blob([new Uint8Array(data as Uint8Array)], { type: mimeMap[targetFormat] }),
    filename: `${baseName}.${targetFormat === 'aac' ? 'aac' : targetFormat}`,
  }
}

export async function mergeAudio(
  files: File[],
  targetFormat: AudioFormat,
  onProgress?: (msg: string) => void,
  bitrate?: string,
  sampleRate?: string,
): Promise<{ blob: Blob; filename: string }> {
  const ff = await loadFFmpeg(onProgress)
  const inputNames: string[] = []

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'tmp'
    const name = `merge_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    await ff.writeFile(name, await fetchFile(file))
    inputNames.push(name)
  }

  // write concat list
  const listContent = inputNames.map(n => `file '${n}'`).join('\n')
  await ff.writeFile('concat_list.txt', listContent)

  const extraArgs: string[] = []
  if (bitrate) extraArgs.push('-b:a', bitrate)
  if (sampleRate) extraArgs.push('-ar', sampleRate)

  const codecArgs = buildCodecArgs(targetFormat, bitrate)
  const outExt = targetFormat === 'aac' ? 'm4a' : targetFormat
  const outputName = `merged_${Date.now()}.${outExt}`

  await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', ...codecArgs, ...extraArgs, outputName])
  const data = await ff.readFile(outputName)

  for (const n of inputNames) await ff.deleteFile(n)
  await ff.deleteFile('concat_list.txt')
  await ff.deleteFile(outputName)

  return {
    blob: new Blob([new Uint8Array(data as Uint8Array)], { type: mimeMap[targetFormat] }),
    filename: `merged.${targetFormat}`,
  }
}
