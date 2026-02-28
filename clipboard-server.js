const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 5678;
const SAVE_DIR = path.join(os.homedir(), 'Downloads');

// Get local IP for display
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
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
  <div class="toast" id="toast"></div>
<script>
  const input = document.getElementById('textInput');
  const albumInput = document.getElementById('albumInput');
  document.getElementById('addBtn').addEventListener('click', () => albumInput.click());

  let toastTimer = null;
  let marker = 0; // 上次确认触发的位置

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
  let synced = false;
  let autoScroll = true;
  let undoText = '';    // clear 前的备份
  let undoMarker = 0;  // clear 前的 marker

  // 同步逻辑：从 marker 到当前 "over" 之间截取增量
  async function doSync() {
    if (synced) return;
    if (Date.now() - lastInputTime < 2000) return;
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
      toast('已清空（说"还原"可撤销）');
      return;
    }

    if (!lower.endsWith(TRIGGER)) return;
    synced = true;
    // 在原始文本中找 "over" 的位置（不依赖 cleaned 坐标）
    const overPos = raw.toLowerCase().lastIndexOf(TRIGGER);
    if (overPos < 0) return;
    if (marker > overPos) marker = 0;
    // 从 marker 到 "over" 之间截取，去掉首尾标点空格
    const segment = raw.substring(marker, overPos)
      .replace(/^[\\s。，！？、；：""''.,!?;:\\-—…·\\u200B]+/, '')
      .replace(/[\\s。，！？、；：""''.,!?;:\\-—…·\\u200B]+$/, '');
    // marker 跳到整个 raw 末尾（包含 "over" 和后面的标点）
    marker = raw.length;
    if (segment) {
      try {
        await fetch('/clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: segment })
        });
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

  input.addEventListener('input', () => {
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

  // Serve the web page
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
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
          execSync(`osascript -e 'set the clipboard to "${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"'`);
          const preview = text.substring(0, 60).replace(/\n/g, '\\n');
          console.log(`[${new Date().toISOString()}] Clip: ${preview}`);
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

        // Copy file to clipboard so Cmd+V works
        try {
          const escapedPath = savePath.replace(/"/g, '\\"');
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
  const ip = getLocalIP();
  console.log(`voice-clip server started`);
  console.log(`Local:   http://127.0.0.1:${PORT}`);
  console.log(`iPhone:  http://${ip}:${PORT}`);
  console.log(`Files save to: ${SAVE_DIR}`);
  console.log(`\nWaiting for connections...`);
});
