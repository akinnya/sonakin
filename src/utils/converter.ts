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

export async function convertAudio(
  file: File,
  targetFormat: AudioFormat,
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const ff = await loadFFmpeg(onProgress)
  const inputName = `input_${Date.now()}.${file.name.split('.').pop()}`
  const baseName = file.name.replace(/\.[^.]+$/, '')
  const outputName = `${baseName}.${targetFormat}`

  await ff.writeFile(inputName, await fetchFile(file))

  const codecArgs: string[] = []
  if (targetFormat === 'aac') {
    codecArgs.push('-c:a', 'aac')
    // aac 需要 mp4 容器
    const mp4Output = `${baseName}.m4a`
    await ff.exec(['-i', inputName, ...codecArgs, mp4Output])
    const data = await ff.readFile(mp4Output)
    await ff.deleteFile(inputName)
    await ff.deleteFile(mp4Output)
    return {
      blob: new Blob([new Uint8Array(data as Uint8Array)], { type: 'audio/aac' }),
      filename: `${baseName}.aac`,
    }
  }

  if (targetFormat === 'mp3') codecArgs.push('-c:a', 'libmp3lame', '-q:a', '2')
  if (targetFormat === 'ogg') codecArgs.push('-c:a', 'libvorbis', '-q:a', '5')
  if (targetFormat === 'flac') codecArgs.push('-c:a', 'flac')
  if (targetFormat === 'wav') codecArgs.push('-c:a', 'pcm_s16le')

  await ff.exec(['-i', inputName, ...codecArgs, outputName])
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
    filename: outputName,
  }
}
