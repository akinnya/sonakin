<div align="center">

# 🎵 Sonakin

<details open>
<summary>中文</summary>

**一个免费、开源、无需服务器的音频格式转换工具**

支持 MP3 / WAV / FLAC / OGG / AAC 互转，视频提取音频，NCM 解密，音频裁剪、合并、音量调整等

文件全程在浏览器本地处理，不上传任何服务器

[🌐 在线使用](https://akinnya.github.io/sonakin/) · [🐛 反馈问题](https://github.com/akinnya/sonakin/issues)

</details>

<details>
<summary>English</summary>

**A free, open-source, serverless audio format converter**

Supports MP3 / WAV / FLAC / OGG / AAC conversion, video-to-audio extraction, NCM decryption, audio trim, merge, and volume control

All processing happens locally in your browser — files never leave your device

[🌐 Live Demo](https://akinnya.github.io/sonakin/) · [🐛 Report Issue](https://github.com/akinnya/sonakin/issues)

</details>

</div>

---

## ✨ 功能特性 / Features

| 中文 | English |
|:---|:---|
| 🔄 音频格式互转：MP3 / WAV / FLAC / OGG / AAC | 🔄 Audio conversion: MP3 / WAV / FLAC / OGG / AAC |
| 📹 视频提取音频：MP4 / MKV / AVI / MOV / WebM 等 | 📹 Video to audio: MP4 / MKV / AVI / MOV / WebM etc. |
| 🔓 网易云 NCM 文件一键解密 | 🔓 NetEase NCM decryption |
| ✂️ 音频裁剪（设置开始/结束时间） | ✂️ Audio trimming (set start/end time) |
| 🔀 多文件合并为一个 | 🔀 Merge multiple files into one |
| 🔊 音量调整（0%~300%） | 🔊 Volume control (0%~300%) |
| 🎚️ 自定义比特率和采样率 | 🎚️ Custom bitrate and sample rate |
| 🎵 上传后在线预览播放 | 🎵 In-browser audio preview |
| 🗂️ 转换历史记录（本地持久化） | 🗂️ Conversion history (locally persisted) |
| 🌙 深色/浅色模式切换 | 🌙 Dark / light mode toggle |
| 🌐 中英文界面切换 | 🌐 Chinese / English UI toggle |
| 📦 批量上传，批量转换，一键全部下载 | 📦 Batch upload, convert, and download |
| 🔒 纯前端，文件不离开设备 | 🔒 100% client-side, files never uploaded |
| 💸 完全免费，无广告，无登录 | 💸 Free, no ads, no login |

## 🛠️ 技术栈 / Tech Stack

| 技术 / Tech | 用途 / Usage |
|:---|:---|
| Vue 3 + TypeScript | 前端框架 / Frontend framework |
| Vite | 构建工具 / Build tool |
| Ant Design Vue | UI 组件库 / UI components |
| ffmpeg.wasm | 浏览器端音视频处理 / Browser-side A/V processing |
| Web Crypto API | NCM 文件解密 / NCM decryption |
| localStorage | 历史记录持久化 / History persistence |
| GitHub Pages | 静态托管 / Static hosting |

## 🚀 本地运行 / Local Development

```bash
git clone https://github.com/akinnya/sonakin.git
cd sonakin
npm install
npm run dev
```

访问 / Visit `http://localhost:5173/sonakin/`

## 📦 支持格式 / Supported Formats

| 格式 / Format | 输入 Input | 输出 Output |
|:---:|:---:|:---:|
| MP3 | ✅ | ✅ |
| WAV | ✅ | ✅ |
| FLAC | ✅ | ✅ |
| OGG | ✅ | ✅ |
| AAC | ✅ | ✅ |
| NCM | ✅ | — |
| MP4/MKV/AVI/MOV/WebM | ✅ | — |

> NCM 解密后自动识别原始格式（通常为 MP3 或 FLAC）

> 视频格式仅支持提取音频，不支持视频输出

## 📄 License

MIT License © 2025 [akinnya](https://github.com/akinnya)

---

<div align="center">
<sub>Built with ❤️ by akinnya · Powered by ffmpeg.wasm</sub>
</div>
