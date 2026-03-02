<div align="center">

# voice-clip

**iPhone 语音输入，语音口令，直达 Mac 剪贴板**

手机说话 → 说"over" → 电脑粘贴 · 零依赖 · 一行安装

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue.svg)](https://www.apple.com/macos)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · **中文**

</div>

---

Mac 上跑一个小服务，iPhone 打开网页就是一个全屏备忘录。用任何语音键盘连续说话，说 **"over"** 就把这段话发到 Mac 剪贴板——不用点任何按钮，手不用碰屏幕。

**为什么不用 iCloud 剪贴板同步？** iCloud 需要两台设备登录同一个 Apple ID。如果手机用的是不同账号（或者你只是想要更快更可靠的方案），voice-clip 走本地 WiFi，零云端依赖。

## 安装

**环境要求：** macOS 13+ · Node.js 18+ · iPhone 和 Mac 在同一个 WiFi 下

```bash
curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/install.sh | bash
```

搞定。浏览器会自动弹出一个二维码页面——用 iPhone 相机扫码，然后点"添加到主屏幕"就行了。

> 卸载：`curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/uninstall.sh | bash`

## 工作原理

```
┌─────────────┐    WiFi (HTTP)    ┌─────────────┐
│   iPhone     │ ──────────────► │     Mac      │
│              │                  │              │
│  语音键盘    │  说 "over"      │  voice-clip  │
│  → 备忘录    │ ──────────────► │  → 剪贴板    │
│  → 免手动    │                  │  → Cmd+V     │
└─────────────┘                   └─────────────┘
```

1. 安装脚本启动服务，浏览器自动打开二维码页面
2. 用 iPhone 扫码——全屏备忘录打开
3. 用任意语音键盘（豆包、iOS 听写等）连续说话
4. 说 **"over"** + 停顿 2 秒——这段新内容发到 Mac 剪贴板
5. 继续说下一段——每次 "over" 只发增量，不是全文
6. 在 Mac 上随时 Cmd+V 粘贴

二维码用的是 Mac 的 `.local` 主机名，所以即使 IP 地址变了也能连上。只需要扫一次码——添加到主屏幕后，App 会一直自动连接。

## 语音口令

| 口令 | 效果 |
|------|------|
| **over** | 把上次 over 之后的新内容发到 Mac 剪贴板 |
| **clear** | 清空手机上所有文字，从头开始 |
| **还原** | 撤销上一次 clear |

所有口令在 **停顿 2 秒** 后触发。语音输入自动加的标点符号不影响识别。

## 功能特性

| 特性 | 说明 |
|------|------|
| **一行安装** | 一条 curl 命令，扫码设置，无需手动配置 |
| **零依赖** | 单个 Node.js 文件，不需要 `npm install` |
| **稳定连接** | 使用 `.local` 主机名——IP 变了也能连 |
| **语音口令** | over / clear / 还原——全程免手动 |
| **增量同步** | 每次 over 只发新内容，不是全文 |
| **双向剪贴板** | Mac 剪贴板内容显示在手机屏幕底部 |
| **图片上传** | 点 "+" 发图片到 Mac（保存到 ~/Downloads，自动复制到剪贴板） |
| **PWA 支持** | 添加到主屏幕，获得原生 App 体验 |
| **开机自启** | LaunchAgent 自动启动，崩溃自动重启 |
| **纯本地** | 所有数据走局域网，不经过任何云端 |

## 文件说明

```
~/.voice-clip/
├── clipboard-server.js    # 服务端
├── voice-clip.log         # 运行日志
└── voice-clip.err.log     # 错误日志
```

## 常见问题

**iPhone 连不上？**
- 确认两台设备在同一个 WiFi 网络下
- 检查 5678 端口是否被防火墙拦截

**Mac 剪贴板没更新？**
- 服务用 `osascript` 写剪贴板。手动运行 `osascript -e 'set the clipboard to "test"'` 验证是否正常。

**说了 "over" 没触发？**
- 说完 "over" 后至少等 2 秒
- 语音键盘可能加标点（如 "over。"）——这个已自动处理

**二维码没弹出来？**
- 手动在 Mac 浏览器打开 `http://localhost:5678/setup`
- 或者直接在 iPhone 上打开 `http://<你的Mac主机名>.local:5678`

## 开源协议

[MIT](LICENSE)
