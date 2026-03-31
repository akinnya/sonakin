<div align="center">

# 🎵 Sonakin

<details open>
<summary>中文</summary>

**一个免费、开源、无需服务器的音频格式转换工具**

支持 MP3 / WAV / FLAC / OGG / AAC 互转，以及网易云 NCM 文件解密

文件全程在浏览器本地处理，不上传任何服务器

[🌐 在线使用](https://akinnya.github.io/sonakin/) · [🐛 反馈问题](https://github.com/akinnya/sonakin/issues)

</details>

<details>
<summary>English</summary>

**A free, open-source, serverless audio format converter**

Supports MP3 / WAV / FLAC / OGG / AAC conversion and NetEase Cloud Music NCM decryption

All processing happens locally in your browser — files never leave your device

[🌐 Live Demo](https://akinnya.github.io/sonakin/) · [🐛 Report Issue](https://github.com/akinnya/sonakin/issues)

</details>

</div>

---

## ✨ 功能特性 / Features

| 中文 | English |
|:---|:---|
| 🔄 音频格式互转，支持 MP3 / WAV / FLAC / OGG / AAC | 🔄 Audio format conversion: MP3 / WAV / FLAC / OGG / AAC |
| 🔓 网易云 NCM 文件一键解密，保留元数据 | 🔓 NetEase NCM decryption with metadata preserved |
| 📦 批量上传，批量转换，一键下载 | 📦 Batch upload, convert, and download |
| 🖱️ 支持拖拽上传 | 🖱️ Drag & drop support |
| 🔒 纯前端处理，文件不离开设备 | 🔒 100% client-side, files never uploaded |
| 🌐 中英文界面切换 | 🌐 Chinese / English UI toggle |
| 💸 完全免费，无广告，无登录 | 💸 Completely free, no ads, no login |

## 🛠️ 技术栈 / Tech Stack

| 技术 / Tech | 用途 / Usage |
|:---|:---|
| Vue 3 + TypeScript | 前端框架 / Frontend framework |
| Vite | 构建工具 / Build tool |
| Ant Design Vue | UI 组件库 / UI components |
| ffmpeg.wasm | 浏览器端音频转换 / Browser-side audio conversion |
| Web Crypto API | NCM 文件解密 / NCM decryption |
| GitHub Pages | 静态托管 / Static hosting |

## 🚀 本地运行 / Local Development

```bash
git clone https://github.com/akinnya/sonakin.git
cd sonakin
npm install
npm run dev
```

访问 / Visit `http://localhost:5173`

## 📦 支持格式 / Supported Formats

| 格式 / Format | 输入 Input | 输出 Output |
|:---:|:---:|:---:|
| MP3 | ✅ | ✅ |
| WAV | ✅ | ✅ |
| FLAC | ✅ | ✅ |
| OGG | ✅ | ✅ |
| AAC | ✅ | ✅ |
| NCM | ✅ | — |

> NCM 解密后自动识别原始格式（通常为 MP3 或 FLAC）
> NCM files are decrypted to their original format (usually MP3 or FLAC)

## 📄 License

MIT License © 2025 [akinnya](https://github.com/akinnya)

---

<div align="center">
<sub>Built with ❤️ by akinnya · Powered by ffmpeg.wasm</sub>
</div>
