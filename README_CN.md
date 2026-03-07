<div align="center">

# voice-clip

**iPhone 语音输入，语音口令，直达电脑剪贴板**

手机说话 → 说"over" → 电脑粘贴 · 零依赖 · 一行安装

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue.svg)](https://www.apple.com/macos)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue.svg)](https://www.microsoft.com/windows)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · **中文**

</div>

---

电脑上跑一个小服务，iPhone 打开网页就是一个全屏备忘录。用任何语音键盘连续说话，说 **"over"** 就把这段话发到电脑剪贴板——不用点任何按钮，手不用碰屏幕。

支持 **macOS** 和 **Windows**——同一份代码，自动识别系统。

**为什么不用 iCloud 剪贴板同步？** iCloud 需要两台设备登录同一个 Apple ID。如果手机用的是不同账号（或者你只是想要更快更可靠的方案），voice-clip 走本地 WiFi，零云端依赖。

## 安装

### macOS

**环境要求：** macOS 13+ · Node.js 18+ · iPhone 和 Mac 在同一个 WiFi 下

```bash
curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/install.sh | bash
```

浏览器会自动弹出一个二维码页面——用 iPhone 相机扫码，然后点"添加到主屏幕"就行了。

> 卸载：`curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/uninstall.sh | bash`

### Windows

**环境要求：** Windows 10/11 · Node.js 18+ · iPhone 和电脑在同一个 WiFi 下

**方式 A — 一行安装（PowerShell）：**

```powershell
curl -fsSL https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/install-windows.bat -o %TEMP%\install-voice-clip.bat && %TEMP%\install-voice-clip.bat
```

**方式 B — 手动安装：**

1. 下载 [clipboard-server.js](https://raw.githubusercontent.com/Tiny-cyber/voice-clip/main/clipboard-server.js) 到 `%USERPROFILE%\.voice-clip\`
2. 运行：`node %USERPROFILE%\.voice-clip\clipboard-server.js`
3. 浏览器打开 `http://localhost:5678/setup`
4. 在 iPhone Safari 中输入页面上显示的地址 → 分享 → 添加到主屏幕

> **说明：** Windows 不生成二维码，设置页面会直接显示地址，在 iPhone Safari 手动输入即可。如果 `.local` 地址连不上，用下面显示的 IP 地址。

> **开机自启：** 按 `Win+R` → 输入 `shell:startup` → 把 `start.bat` 的快捷方式放进去。

## 工作原理

```
┌─────────────┐    WiFi (HTTP)    ┌─────────────┐
│   iPhone     │ ──────────────► │  Mac / PC    │
│              │                  │              │
│  语音键盘    │  说 "over"      │  voice-clip  │
│  → 备忘录    │ ──────────────► │  → 剪贴板    │
│  → 免手动    │                  │  → 粘贴      │
└─────────────┘                   └─────────────┘
```

1. 安装脚本启动服务，浏览器自动打开设置页面
2. 连接手机（Mac 扫二维码，Windows 手动输入地址）
3. 用任意语音键盘（豆包、iOS 听写等）连续说话
4. 说 **"over"** + 停顿 2 秒——这段新内容发到电脑剪贴板
5. 继续说下一段——每次 "over" 只发增量，不是全文
6. 在 Mac 按 Cmd+V 或在 Windows 按 Ctrl+V 粘贴

设置页面用的是电脑的 `.local` 主机名，所以即使 IP 地址变了也能连上。只需要设置一次——添加到主屏幕后，App 会一直自动连接。

## 语音口令

| 口令 | 效果 |
|------|------|
| **over** | 把上次 over 之后的新内容发到电脑剪贴板 |
| **clear** | 清空手机上所有文字，从头开始 |
| **还原** | 撤销上一次 clear |

所有口令在 **停顿 2 秒** 后触发。语音输入自动加的标点符号不影响识别。

## 功能特性

| 特性 | 说明 |
|------|------|
| **跨平台** | macOS 和 Windows 通用，同一份代码 |
| **一行安装** | 一条命令搞定，无需手动配置 |
| **零依赖** | 单个 Node.js 文件，不需要 `npm install` |
| **稳定连接** | 使用 `.local` 主机名——IP 变了也能连 |
| **语音口令** | over / clear / 还原——全程免手动 |
| **增量同步** | 每次 over 只发新内容，不是全文 |
| **双向剪贴板** | 电脑剪贴板内容显示在手机屏幕底部 |
| **图片上传** | 点 "+" 发图片到电脑（保存到 ~/Downloads，自动复制到剪贴板） |
| **PWA 支持** | 添加到主屏幕，获得原生 App 体验 |
| **开机自启** | Mac 用 LaunchAgent，Windows 用启动文件夹 |
| **纯本地** | 所有数据走局域网，不经过任何云端 |

## 文件说明

```
~/.voice-clip/                          # Mac: ~/.voice-clip/  Windows: %USERPROFILE%\.voice-clip\
├── clipboard-server.js    # 服务端
├── start.bat              # Windows 启动脚本（仅 Windows）
├── voice-clip.log         # 运行日志（仅 Mac）
└── voice-clip.err.log     # 错误日志（仅 Mac）
```

## 常见问题

**iPhone 连不上？**
- 确认两台设备在同一个 WiFi 网络下
- 检查 5678 端口是否被防火墙拦截
- Windows 上首次运行可能弹出防火墙提示，需要点"允许访问"

**剪贴板没更新？**
- Mac：手动运行 `osascript -e 'set the clipboard to "test"'` 验证
- Windows：手动运行 `powershell -command "Set-Clipboard -Value 'test'"` 验证

**Windows 上 `.local` 地址连不上？**
- `.local`（mDNS）在 Windows 10 1903 以上版本才支持。如果连不上，用设置页面上显示的 IP 地址。

**说了 "over" 没触发？**
- 说完 "over" 后至少等 2 秒
- 语音键盘可能加标点（如 "over。"）——这个已自动处理

**设置页面 / 二维码没弹出来？**
- 手动在浏览器打开 `http://localhost:5678/setup`
- 或者直接在 iPhone 上打开 `http://<你的电脑主机名>.local:5678`

## 开源协议

[MIT](LICENSE)
