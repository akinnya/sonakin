const NCM_MAGIC = [0x43, 0x54, 0x45, 0x4e, 0x46, 0x44, 0x41, 0x4d]
const CORE_KEY = [0x68, 0x7a, 0x48, 0x52, 0x41, 0x6d, 0x73, 0x6f, 0x35, 0x6b, 0x49, 0x6e, 0x62, 0x61, 0x78, 0x57]
const META_KEY = [0x23, 0x31, 0x34, 0x6c, 0x6a, 0x6b, 0x5f, 0x21, 0x5c, 0x5d, 0x26, 0x30, 0x55, 0x3c, 0x27, 0x28]

async function aesDecryptECB(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key.buffer as ArrayBuffer, { name: 'AES-CBC', length: 128 }, false, ['decrypt'])
  // ECB mode: decrypt each 16-byte block independently with CBC + zero IV
  const result = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i += 16) {
    const block = data.slice(i, i + 16)
    const iv = new Uint8Array(16)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, block)
    result.set(new Uint8Array(decrypted), i)
  }
  return result
}

function buildKeyBox(key: Uint8Array): Uint8Array {
  const box = new Uint8Array(256)
  for (let i = 0; i < 256; i++) box[i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (box[i] + j + key[i % key.length]) & 0xff
    ;[box[i], box[j]] = [box[j], box[i]]
  }
  return box
}

function pkcs7Unpad(data: Uint8Array): Uint8Array {
  const pad = data[data.length - 1]
  return data.slice(0, data.length - pad)
}

export interface NcmMeta {
  musicName?: string
  artist?: [string, number][]
  album?: string
  format?: string
}

export interface NcmResult {
  blob: Blob
  filename: string
  meta: NcmMeta
  coverBlob?: Blob
}

export async function decryptNcm(file: File): Promise<NcmResult> {
  const buf = await file.arrayBuffer()
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)
  let offset = 0

  // verify magic
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== NCM_MAGIC[i]) throw new Error('不是有效的 NCM 文件')
  }
  offset = 10 // skip magic + 2 bytes gap

  // read key data
  const keyLen = view.getUint32(offset, true)
  offset += 4
  const keyData = bytes.slice(offset, offset + keyLen).map((b) => b ^ 0x64)
  offset += keyLen

  const decryptedKey = pkcs7Unpad(await aesDecryptECB(keyData, new Uint8Array(CORE_KEY)))
  const rc4Key = decryptedKey.slice(17) // skip "neteasecloudmusic"
  const keyBox = buildKeyBox(rc4Key)

  // read meta data
  const metaLen = view.getUint32(offset, true)
  offset += 4
  let meta: NcmMeta = {}
  if (metaLen > 0) {
    const metaData = bytes.slice(offset, offset + metaLen).map((b) => b ^ 0x63)
    offset += metaLen
    // skip "163 key(Don't modify):"
    const b64 = new TextDecoder().decode(metaData.slice(22))
    const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const decryptedMeta = pkcs7Unpad(await aesDecryptECB(decoded, new Uint8Array(META_KEY)))
    const metaStr = new TextDecoder().decode(decryptedMeta)
    // skip "music:"
    try {
      meta = JSON.parse(metaStr.slice(6))
    } catch {}
  } else {
    offset += metaLen
  }

  // skip crc32 + gap
  offset += 9

  // read cover
  const coverLen = view.getUint32(offset, true)
  offset += 4
  let coverBlob: Blob | undefined
  if (coverLen > 0) {
    coverBlob = new Blob([bytes.slice(offset, offset + coverLen)], { type: 'image/jpeg' })
  }
  offset += coverLen

  // decrypt audio
  const audioData = new Uint8Array(bytes.length - offset)
  for (let i = 0; i < audioData.length; i++) {
    const j = (i + 1) & 0xff
    audioData[i] = bytes[offset + i] ^ keyBox[(keyBox[j] + keyBox[(keyBox[j] + j) & 0xff]) & 0xff]
  }

  const format = meta.format || 'mp3'
  const mimeMap: Record<string, string> = { mp3: 'audio/mpeg', flac: 'audio/flac' }
  const baseName = file.name.replace(/\.ncm$/i, '')

  return {
    blob: new Blob([audioData], { type: mimeMap[format] || 'audio/mpeg' }),
    filename: `${baseName}.${format}`,
    meta,
    coverBlob,
  }
}
