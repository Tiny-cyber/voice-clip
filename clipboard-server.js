const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

const PORT = 5678;
const SAVE_DIR = path.join(os.homedir(), 'Downloads');
const QR_PATH = path.join(os.homedir(), '.voice-clip', 'voice-clip-qr.png');
const QR_HOST_FILE = path.join(os.homedir(), '.voice-clip', '.qr-hostname');
const SETUP_FLAG = path.join(os.homedir(), '.voice-clip', '.setup-complete');

// --- Cross-platform clipboard functions ---

function setClipboardText(text) {
  if (IS_MAC) {
    // Write to temp file to avoid shell escaping issues (single quotes, etc.)
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    const script = `set the clipboard to "${escaped}"`;
    fs.writeFileSync('/tmp/voice-clip-set.scpt', script);
    execSync('osascript /tmp/voice-clip-set.scpt');
  } else if (IS_WIN) {
    // Use -EncodedCommand to avoid cmd.exe breaking on " and newlines in text
    const escaped = text.replace(/'/g, "''");
    const psScript = `Set-Clipboard -Value '${escaped}'`;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { timeout: 5000 });
  }
}

function getClipboardText() {
  if (IS_MAC) {
    return execSync("osascript -e 'the clipboard as text'", { encoding: 'utf8', timeout: 3000 }).trim();
  } else if (IS_WIN) {
    return execSync('powershell -NoProfile -command "Get-Clipboard"', { encoding: 'utf8', timeout: 5000 }).trim();
  }
  return '';
}

function setClipboardImage(filePath) {
  if (IS_MAC) {
    const escapedPath = filePath.replace(/"/g, '\\"');
    const script = `use framework "AppKit"
use framework "Foundation"
set pb to current application's NSPasteboard's generalPasteboard()
pb's clearContents()
set imageData to current application's NSData's dataWithContentsOfFile:"${escapedPath}"
set img to current application's NSImage's alloc()'s initWithData:imageData
pb's writeObjects:{img}`;
    const scriptPath = '/tmp/voice-clip-copy.scpt';
    fs.writeFileSync(scriptPath, script);
    execSync('osascript ' + scriptPath);
  } else if (IS_WIN) {
    const escapedPath = filePath.replace(/'/g, "''");
    const ps = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${escapedPath}'); [System.Windows.Forms.Clipboard]::SetImage($img); $img.Dispose()`;
    execSync(`powershell -NoProfile -command "${ps}"`, { timeout: 10000 });
  }
}

function openBrowser(url) {
  if (IS_MAC) {
    execSync(`open "${url}"`);
  } else if (IS_WIN) {
    execSync(`start "" "${url}"`);
  }
}

// Get local IP for fallback display
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// Get .local hostname (stable, doesn't change with DHCP)
function getLocalHostname() {
  const h = os.hostname();
  return h.endsWith('.local') ? h : h + '.local';
}

// Generate QR code using macOS CoreImage (zero dependencies, Mac only)
function generateQR(url) {
  if (!IS_MAC) return false;
  const swift = [
    'import Cocoa',
    'import CoreImage',
    `let data = "${url}".data(using: .utf8)!`,
    'let filter = CIFilter(name: "CIQRCodeGenerator")!',
    'filter.setValue(data, forKey: "inputMessage")',
    'filter.setValue("L", forKey: "inputCorrectionLevel")',
    'let transform = CGAffineTransform(scaleX: 10, y: 10)',
    'let output = filter.outputImage!.transformed(by: transform)',
    'let rep = NSBitmapImageRep(ciImage: output)',
    'let pngData = rep.representation(using: .png, properties: [:])!',
    `try! pngData.write(to: URL(fileURLWithPath: "${QR_PATH}"))`,
  ].join('\n');
  const scriptPath = '/tmp/voice-clip-qr.swift';
  fs.writeFileSync(scriptPath, swift);
  try {
    execSync('swift ' + scriptPath, { timeout: 30000, stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log('QR code generation failed:', e.message);
    return false;
  }
}

// Check if QR needs (re)generation: first run, or hostname changed
function needsSetup(hostname) {
  if (fs.existsSync(SETUP_FLAG)) return false;
  try {
    const stored = fs.readFileSync(QR_HOST_FILE, 'utf8').trim();
    return stored !== hostname || !fs.existsSync(QR_PATH);
  } catch { return true; }
}

// Mark setup as done (called when first phone connection comes in)
function markSetupComplete(hostname) {
  try {
    fs.writeFileSync(QR_HOST_FILE, hostname);
    fs.writeFileSync(SETUP_FLAG, new Date().toISOString());
  } catch (e) {}
}

// Setup page with QR code (or URL-only on Windows)
function setupHTML(phoneUrl, ipUrl) {
  const hasQR = IS_MAC;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Voice Clip Setup</title>
<style>
  body {
    background: #1a1a1a; color: #e0e0e0;
    font-family: -apple-system, Segoe UI, sans-serif;
    display: flex; justify-content: center; align-items: center;
    height: 100vh; margin: 0;
  }
  .container { text-align: center; }
  h1 { font-size: 28px; margin-bottom: 24px; font-weight: 500; }
  img {
    width: 220px; height: 220px;
    border-radius: 16px; background: white; padding: 12px;
  }
  .url {
    margin-top: 20px; font-size: 15px; color: #888;
    font-family: SF Mono, Consolas, monospace;
  }
  .url-alt {
    margin-top: 8px; font-size: 13px; color: #666;
    font-family: SF Mono, Consolas, monospace;
  }
  .steps {
    margin-top: 20px; font-size: 14px; color: #555;
    line-height: 2;
  }
</style></head>
<body><div class="container">
  <h1>Voice Clip</h1>
  ${hasQR ? '<img src="/qr.png" alt="QR Code">' : ''}
  <div class="url">${phoneUrl}</div>
  <div class="url-alt">${ipUrl}</div>
  <div class="steps">
    ${hasQR
      ? 'iPhone 相机扫码 → 打开链接 → 分享 → 添加到主屏幕'
      : '在手机 Safari 中输入上方地址 → 分享 → 添加到主屏幕<br>如果 .local 地址连不上，试试下面的 IP 地址'}
  </div>
</div></body></html>`;
}

// The web page served to iPhone
const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Voice Clip">
<title>Voice Clip</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    background: #1a1a1a;
    color: #e0e0e0;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    padding-top: env(safe-area-inset-top, 8px);
    flex-shrink: 0;
  }
  .topbar .status {
    font-size: 12px;
    color: #555;
  }
  .topbar .dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #4CAF50;
    margin-right: 4px;
    vertical-align: middle;
  }
  #addBtn {
    background: none;
    border: 1px solid #333;
    border-radius: 50%;
    color: #666;
    width: 32px;
    height: 32px;
    font-size: 18px;
    line-height: 30px;
    text-align: center;
    cursor: pointer;
  }
  #addBtn:active { background: #2a2a2a; }
  #textInput {
    flex: 1;
    background: transparent;
    border: none;
    color: #e0e0e0;
    font-size: 17px;
    padding: 16px;
    padding-bottom: env(safe-area-inset-bottom, 16px);
    outline: none;
    -webkit-appearance: none;
    resize: none;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-overflow-scrolling: touch;
  }
  #textInput::placeholder { color: #333; }
  #macClipBar {
    flex-shrink: 0;
    flex-basis: 33vh;
    border-top: 1px solid #333;
    padding: 10px 16px;
    padding-bottom: env(safe-area-inset-bottom, 10px);
    background: #222;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  #macClipBar .label {
    font-size: 11px;
    color: #555;
    margin-bottom: 4px;
  }
  #macClipContent {
    font-size: 14px;
    color: #aaa;
    word-break: break-all;
    user-select: all;
    -webkit-user-select: all;
  }
  #macClipContent.fresh {
    color: #4CAF50;
    transition: color 0.3s;
  }
  .toast {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 15px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 100;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
  <div class="topbar">
    <div class="status"><span class="dot"></span>已连接</div>
    <div id="addBtn">+</div>
  </div>
  <input type="file" id="albumInput" accept="image/*" multiple style="display:none">
  <textarea id="textInput" placeholder="说话...说 over 同步到剪贴板" autocomplete="off" autofocus></textarea>
  <div id="macClipBar">
    <div class="label">电脑剪贴板 ↓（点击复制）</div>
    <div id="macClipContent">等待中...</div>
  </div>
  <div class="toast" id="toast"></div>
<script>
  const input = document.getElementById('textInput');
  const albumInput = document.getElementById('albumInput');
  document.getElementById('addBtn').addEventListener('click', () => albumInput.click());

  let toastTimer = null;
  let marker = input.value.length; // 跳过浏览器恢复的旧内容

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  const TRIGGER = 'over';
  const TRIGGER_LEN = TRIGGER.length;

  // 去掉末尾标点、空格、换行（豆包语音可能加各种符号）
  // 注意：双反斜杠是因为这段 JS 在 Node 模板字符串里
  function stripTail(s) {
    return s.replace(/[\\s。，！？、；：""''.,!?;:\\-—…·\\u200B]+$/g, '');
  }

  let lastInputTime = 0;
  let synced = input.value.length > 0; // 有恢复内容就标记为已同步，防止重放
  let autoScroll = true;
  let undoText = '';    // clear 前的备份
  let undoMarker = 0;  // clear 前的 marker
  let pendingOverText = '';  // "over" 确认机制：首次检测到存快照，下次确认没变才同步

  // 防丢机制：保护 textarea 内容不被输入法意外替换
  let contentBackup = input.value;  // 已知最长文本
  let lostChunks = [];              // 被输入法吞掉的片段

  function protectContent(current) {
    // 正常增长：更新备份
    if (current.length >= contentBackup.length) {
      contentBackup = current;
      return current;
    }
    // 内容突然缩短超过 40%，且之前有足够内容 → 输入法替换了 textarea
    if (contentBackup.length > 30 && current.length < contentBackup.length * 0.6) {
      // 把之前的内容存为丢失片段
      lostChunks.push(contentBackup);
      contentBackup = current;
      console.log('[protect] content drop: ' + contentBackup.length + ' → ' + current.length + ', saved chunk');
      return current;
    }
    // 小幅缩短（删字、纠错）：正常更新
    contentBackup = current;
    return current;
  }

  // 同步逻辑：从 marker 到当前 "over" 之间截取增量
  async function doSync() {
    if (synced) return;
    if (Date.now() - lastInputTime < 1000) return;
    const raw = input.value;
    const cleaned = stripTail(raw);
    const lower = cleaned.toLowerCase();

    // "还原" + 2秒 → 恢复上次 clear 的内容
    if (cleaned.endsWith('还原') && undoText) {
      synced = true;
      input.value = undoText;
      marker = undoMarker;
      undoText = '';
      toast('已撤销');
      return;
    }

    // "clear" + 2秒 → 清空所有内容，重置 marker
    if (lower.endsWith('clear')) {
      synced = true;
      undoText = raw;      // 备份
      undoMarker = marker;  // 备份 marker
      input.value = '';
      marker = 0;
      contentBackup = '';   // 重置防丢状态
      lostChunks = [];
      toast('已清空（说"还原"可撤销）');
      return;
    }

    if (!lower.endsWith(TRIGGER)) {
      pendingOverText = '';  // 文本不以 "over" 结尾，清除待确认状态
      return;
    }
    // 防误触：首次检测到 "over" 结尾 → 存快照，等下一轮(300ms)再确认
    // 如果语音键盘把 "over" 补成 "overlay"，下一轮文本会变，就不会触发
    if (pendingOverText !== raw) {
      pendingOverText = raw;
      return;
    }
    pendingOverText = '';  // 确认完毕，清除状态
    synced = true;
    // 在原始文本中找 "over" 的位置（不依赖 cleaned 坐标）
    const overPos = raw.toLowerCase().lastIndexOf(TRIGGER);
    if (overPos < 0) return;
    if (marker > overPos) {
      // 语音输入法可能重写文本导致 marker 越界，找上一个 "over" 作为起点
      const prevOver = raw.toLowerCase().lastIndexOf(TRIGGER, overPos - 1);
      marker = prevOver >= 0 ? prevOver + TRIGGER.length : 0;
    }
    // 从 marker 到 "over" 之间截取，去掉首尾标点空格
    let segment = raw.substring(marker, overPos)
      .replace(/^[\\s。，！？、；：""''.,!?;:\\-—…·\\u200B]+/, '')
      .replace(/[\\s。，！？、；：""''.,!?;:\\-—…·\\u200B]+$/, '');

    // 如果有被输入法吞掉的片段，拼接到前面
    if (lostChunks.length > 0) {
      // 从每个丢失片段中提取有效内容（去掉已同步的部分和 "over" 标记）
      const recovered = lostChunks.map(chunk => {
        // 找到 marker 之后、最后一个 "over" 之前的内容
        const chunkLower = chunk.toLowerCase();
        const lastOver = chunkLower.lastIndexOf(TRIGGER);
        // 如果片段里有 "over"，取 over 之前未同步的部分
        const end = lastOver >= 0 ? lastOver : chunk.length;
        const start = Math.min(marker, end);
        return chunk.substring(start, end)
          .replace(/^[\\s。，！？、；：""''.,!?;:\\-—…·\\u200B]+/, '')
          .replace(/[\\s。，！？、；：""''.,!?;:\\-—…·\\u200B]+$/, '');
      }).filter(s => s.length > 0);

      if (recovered.length > 0) {
        segment = recovered.join('') + segment;
        console.log('[protect] recovered ' + recovered.length + ' lost chunks, total: ' + segment.length + ' chars');
      }
      lostChunks = [];
    }

    // marker 跳到整个 raw 末尾（包含 "over" 和后面的标点）
    marker = raw.length;
    if (segment) {
      try {
        await fetch('/clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: segment })
        });
        sentFromPhone.add(segment);
        // keep set small, only remember last 20
        if (sentFromPhone.size > 20) {
          const first = sentFromPhone.values().next().value;
          sentFromPhone.delete(first);
        }
        toast('已同步');
      } catch (e) {
        toast('同步失败');
      }
    }
  }

  function onInput() {
    lastInputTime = Date.now();
    synced = false;
    autoScroll = true; // 有新输入 → 重新锁定底部
  }

  // 用户手动上滑 → 解除自动滚底
  input.addEventListener('scroll', () => {
    const atBottom = (input.scrollHeight - input.scrollTop - input.clientHeight) < 30;
    if (!atBottom) autoScroll = false;
  });

  // 每 300ms：检查同步 + 保持滚到底部
  setInterval(() => {
    doSync();
    if (autoScroll) input.scrollTop = input.scrollHeight;
  }, 300);

  albumInput.addEventListener('change', async () => {
    for (const file of albumInput.files) await uploadFile(file);
    albumInput.value = '';
  });

  async function uploadFile(file) {
    toast('上传中...');
    try {
      const b64 = await toBase64(file);
      const res = await fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: b64, type: file.type })
      });
      if (res.ok) {
        const r = await res.json();
        toast('已保存 ' + r.size);
      } else {
        toast('上传失败');
      }
    } catch (e) {
      toast('上传失败');
    }
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // Mac clipboard polling (skip content sent from this phone)
  const macClipEl = document.getElementById('macClipContent');
  let lastMacClip = '';
  let sentFromPhone = new Set(); // track what we sent
  async function pollMacClip() {
    try {
      const res = await fetch('/mac-clip');
      const data = await res.json();
      if (data.text && data.text !== lastMacClip && !sentFromPhone.has(data.text)) {
        lastMacClip = data.text;
        macClipEl.textContent = data.text.length > 500 ? data.text.substring(0, 500) + '...' : data.text;
        macClipEl.classList.add('fresh');
        setTimeout(() => macClipEl.classList.remove('fresh'), 2000);
      }
    } catch (e) {}
  }
  setInterval(pollMacClip, 2000);
  pollMacClip();

  // Tap to copy mac clipboard content
  macClipEl.addEventListener('click', () => {
    if (lastMacClip) {
      navigator.clipboard.writeText(lastMacClip).then(() => {
        toast('已复制到手机');
      }).catch(() => {
        // fallback for older iOS
        const ta = document.createElement('textarea');
        ta.value = lastMacClip;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast('已复制到手机');
      });
    }
  });

  input.addEventListener('input', () => {
    protectContent(input.value);
    onInput();
    // 始终滚到底部，防止上下跳
    setTimeout(() => { input.scrollTop = input.scrollHeight; }, 0);
  });
  setTimeout(() => input.focus(), 300);
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve setup page with QR code (or URL on Windows)
  if (req.method === 'GET' && req.url === '/setup') {
    const hostname = getLocalHostname();
    const ip = getLocalIP();
    const phoneUrl = `http://${hostname}:${PORT}`;
    const ipUrl = `http://${ip}:${PORT}`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(setupHTML(phoneUrl, ipUrl));
    return;
  }

  // Serve QR code image
  if (req.method === 'GET' && req.url === '/qr.png') {
    try {
      const img = fs.readFileSync(QR_PATH);
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
      res.end(img);
    } catch (e) {
      res.writeHead(404);
      res.end('QR not generated');
    }
    return;
  }

  // Serve the web page
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  // PC clipboard → iPhone (read clipboard)
  if (req.method === 'GET' && req.url === '/mac-clip') {
    try {
      const clip = getClipboardText();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ text: clip }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text: '' }));
    }
    return;
  }

  // Receive clipboard text
  if (req.method === 'POST' && req.url === '/clip') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        if (text && typeof text === 'string') {
          setClipboardText(text);
          const preview = text.substring(0, 60).replace(/\n/g, '\\n');
          console.log(`[${new Date().toISOString()}] Clip: ${preview}`);
          // First successful clip = phone connected, setup done
          if (!fs.existsSync(SETUP_FLAG)) markSetupComplete(getLocalHostname());
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'missing text' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'invalid json' }));
      }
    });
    return;
  }

  // File upload
  if (req.method === 'POST' && req.url === '/upload') {
    let chunks = [];
    let size = 0;
    const MAX = 50 * 1024 * 1024; // 50MB (base64 encoded, ~37MB actual)

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX) {
        req.destroy();
        res.writeHead(413);
        res.end(JSON.stringify({ error: '文件太大（最大 50MB）' }));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString());
        if (!data.filename || !data.data) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'missing filename or data' }));
          return;
        }

        // Sanitize filename, add timestamp
        const safe = data.filename.replace(/[/\\:*?"<>|]/g, '_');
        const ext = path.extname(safe);
        const base = path.basename(safe, ext);
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const name = `${base}_${ts}${ext}`;
        const savePath = path.join(SAVE_DIR, name);

        const buf = Buffer.from(data.data, 'base64');
        fs.writeFileSync(savePath, buf);

        // Copy file to clipboard so Ctrl+V / Cmd+V works
        try {
          setClipboardImage(savePath);
        } catch (e) {
          console.log('Clipboard copy failed:', e.message);
        }

        const sizeStr = buf.length < 1024 * 1024
          ? (buf.length / 1024).toFixed(1) + ' KB'
          : (buf.length / (1024 * 1024)).toFixed(1) + ' MB';

        console.log(`[${new Date().toISOString()}] File: ${name} (${sizeStr}) → clipboard`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: '~/Downloads/' + name, size: sizeStr }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'upload failed' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const hostname = getLocalHostname();
  const ip = getLocalIP();
  const phoneUrl = `http://${hostname}:${PORT}`;
  console.log(`voice-clip server started`);
  console.log(`Local:   http://127.0.0.1:${PORT}`);
  console.log(`iPhone:  ${phoneUrl}`);
  console.log(`IP:      http://${ip}:${PORT}`);
  console.log(`Files save to: ${SAVE_DIR}`);

  // First run: generate QR and auto-open setup page
  // After phone connects successfully, setup is marked done and won't auto-open again
  const firstRun = needsSetup(hostname);
  if (firstRun || !fs.existsSync(QR_PATH)) {
    if (generateQR(phoneUrl)) {
      try { fs.writeFileSync(QR_HOST_FILE, hostname); } catch (e) {}
    }
  }
  if (firstRun) {
    console.log(`\n  First run! Opening setup page...`);
    try { openBrowser(`http://localhost:${PORT}/setup`); } catch (e) {}
  }
  console.log(`Setup:   http://localhost:${PORT}/setup`);

  console.log(`\nWaiting for connections...`);
});
