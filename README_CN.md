<div align="center">

# voice-clip

**iPhone 语音输入，直达 Mac 剪贴板**

手机说话 → 电脑粘贴 · 零依赖 · 支持 PWA

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue.svg)](https://www.apple.com/macos)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · **中文**

</div>

---

Mac 上跑一个小服务，iPhone 打开网页，说话或打字，点发送，内容直接到 Mac 剪贴板——Cmd+V 即粘贴。

**为什么不用 iCloud 剪贴板同步？** iCloud 需要两台设备登录同一个 Apple ID。如果手机用的是不同账号（或者你只是想要更快更可靠的方案），voice-clip 走本地 WiFi，零云端依赖。

## 工作原理

```
┌─────────────┐    WiFi (HTTP POST)    ┌─────────────┐
│   iPhone     │ ────────────────────► │     Mac      │
│              │                        │              │
│  语音键盘    │   { "text": "..." }   │  voice-clip  │
│  → 网页输入  │ ────────────────────► │  → 剪贴板    │
│  → 发送      │                        │  → Cmd+V     │
└─────────────┘    ◄──── { ok: true }  └─────────────┘
```

1. Mac 运行 `clipboard-server.js`，监听 5678 端口
2. iPhone 用 Safari 打开 `http://<Mac 的 IP>:5678`
3. 用任意语音键盘（豆包、iOS 听写等）输入文字
4. 点发送——文字通过 `osascript` 写入 Mac 剪贴板
5. 在 Mac 上 Cmd+V 粘贴

## 快速开始

**环境要求：** macOS 13+ · Node.js 18+ · iPhone 和 Mac 在同一个 WiFi 下

```bash
git clone https://github.com/Tiny-cyber/voice-clip.git
cd voice-clip
chmod +x install.sh
./install.sh
```

安装脚本会：
- 将服务注册为 macOS LaunchAgent（开机自启 + 崩溃重启）
- 打印 iPhone 要访问的地址

> 卸载：`./uninstall.sh`

### 手动启动（不安装）

```bash
node clipboard-server.js
```

然后在 iPhone 上打开 `http://<Mac IP>:5678`。

## 添加到 iPhone 主屏幕（PWA）

1. 在 iPhone 的 Safari 中打开地址
2. 点分享按钮 → "添加到主屏幕"
3. 现在它看起来就像一个原生 App——全屏，没有浏览器边框

## 功能特性

| 特性 | 说明 |
|------|------|
| **零依赖** | 单个 Node.js 文件，不需要 `npm install` |
| **PWA 支持** | 添加到主屏幕，获得原生 App 体验 |
| **暗色主题** | 跟 iOS 深色模式搭配，晚上不刺眼 |
| **发送历史** | 显示最近发送的内容和时间 |
| **开机自启** | LaunchAgent 自动启动，崩溃自动重启 |
| **osascript 剪贴板** | 后台进程也能可靠写入剪贴板（`pbcopy` 做不到） |
| **纯本地** | 所有数据走局域网，不经过任何云端 |

## 文件说明

```
~/.voice-clip/
├── clipboard-server.js       # 服务端
├── clipboard-server.log      # 运行日志
└── clipboard-server.err.log  # 错误日志
```

## 常见问题

**iPhone 连不上？**
- 确认两台设备在同一个 WiFi 网络下
- 检查 5678 端口是否被防火墙拦截

**Mac 剪贴板没更新？**
- 服务用 `osascript` 写剪贴板。手动运行 `osascript -e 'set the clipboard to "test"'` 验证是否正常。

## 开源协议

[MIT](LICENSE)
