<div align="center">

# 🎵 Sonakin

**一个免费、开源、无需服务器的音频格式转换工具**

支持 MP3 / WAV / FLAC / OGG / AAC 互转，以及网易云 NCM 文件解密

文件全程在浏览器本地处理，不上传任何服务器

[🌐 在线使用](https://akinnya.github.io/sonakin/) · [🐛 反馈问题](https://github.com/akinnya/sonakin/issues)

</div>

---

## ✨ 功能特性

- 🔄 **音频格式互转** — MP3、WAV、FLAC、OGG、AAC 任意互转
- 🔓 **NCM 解密** — 网易云音乐加密文件一键解密，自动保留歌曲元数据
- 📦 **批量处理** — 同时上传多个文件，批量转换一键下载
- 🖱️ **拖拽上传** — 支持拖拽文件到页面直接处理
- 🔒 **隐私安全** — 所有处理在浏览器本地完成，文件不离开你的设备
- 💸 **完全免费** — 无广告、无登录、无限制

## 🛠️ 技术栈

| 技术 | 用途 |
|:---|:---|
| Vue 3 + TypeScript | 前端框架 |
| Vite | 构建工具 |
| Ant Design Vue | UI 组件库 |
| ffmpeg.wasm | 浏览器端音频转换 |
| Web Crypto API | NCM 文件解密 |
| GitHub Pages | 静态托管 |

## 🚀 本地运行

```bash
git clone https://github.com/akinnya/sonakin.git
cd sonakin
npm install
npm run dev
```

访问 `http://localhost:5173`

## 📦 支持格式

| 格式 | 输入 | 输出 |
|:---:|:---:|:---:|
| MP3 | ✅ | ✅ |
| WAV | ✅ | ✅ |
| FLAC | ✅ | ✅ |
| OGG | ✅ | ✅ |
| AAC | ✅ | ✅ |
| NCM | ✅ | — |

> NCM 解密后自动识别原始格式（通常为 MP3 或 FLAC）

## 📄 License

MIT License © 2025 [akinnya](https://github.com/akinnya)

---

<div align="center">
<sub>Built with ❤️ by akinnya · Powered by ffmpeg.wasm</sub>
</div>
