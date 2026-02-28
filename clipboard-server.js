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
    padding: 20px;
    padding-top: env(safe-area-inset-top, 20px);
  }
  .status {
    text-align: center;
    font-size: 13px;
    color: #888;
    margin-bottom: 12px;
  }
  .status .dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #4CAF50;
    margin-right: 6px;
    vertical-align: middle;
  }
  .history {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 12px;
    -webkit-overflow-scrolling: touch;
  }
  .history-item {
    background: #2a2a2a;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 8px;
    font-size: 15px;
    line-height: 1.4;
    word-break: break-all;
  }
  .history-item .time {
    font-size: 11px;
    color: #666;
    margin-top: 4px;
  }
  .history-item img {
    max-width: 120px;
    max-height: 120px;
    border-radius: 8px;
    margin-bottom: 6px;
    display: block;
    object-fit: cover;
  }
  .input-area {
    display: flex;
    gap: 8px;
    align-items: center;
    padding-bottom: env(safe-area-inset-bottom, 10px);
  }
  #addBtn {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 50%;
    color: #888;
    width: 42px;
    height: 42px;
    font-size: 22px;
    line-height: 40px;
    text-align: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  #addBtn:active { background: #333; }
  #textInput {
    flex: 1;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 10px;
    color: #e0e0e0;
    font-size: 16px;
    padding: 12px 14px;
    outline: none;
    -webkit-appearance: none;
  }
  #textInput:focus { border-color: #666; }
  #sendBtn {
    background: #d4a853;
    color: #1a1a1a;
    border: none;
    border-radius: 10px;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  #sendBtn:active { opacity: 0.7; }
  #sendBtn:disabled { background: #555; color: #888; }
  .upload-progress {
    background: #333;
    border-radius: 4px;
    height: 3px;
    margin-top: 6px;
    overflow: hidden;
  }
  .upload-progress-bar {
    background: #d4a853;
    height: 100%;
    width: 0%;
    transition: width 0.3s;
  }
</style>
</head>
<body>
  <div class="status"><span class="dot"></span>已连接到 Mac</div>
  <div class="history" id="history"></div>
  <div class="input-area">
    <div id="addBtn">+</div>
    <input type="file" id="albumInput" accept="image/*" multiple style="display:none">
    <input type="text" id="textInput" placeholder="点这里，然后切换到豆包语音..." autocomplete="off" autofocus>
    <button id="sendBtn">发送</button>
  </div>
<script>
  const input = document.getElementById('textInput');
  const btn = document.getElementById('sendBtn');
  const hist = document.getElementById('history');
  const albumInput = document.getElementById('albumInput');
  document.getElementById('addBtn').addEventListener('click', () => albumInput.click());

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    btn.disabled = true;
    try {
      const res = await fetch('/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        addHistory(text);
        input.value = '';
        input.focus();
      }
    } catch (e) {
      alert('发送失败，检查 WiFi 连接');
    }
    btn.disabled = false;
  }

  function addHistory(text) {
    const div = document.createElement('div');
    div.className = 'history-item';
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = text + '<div class="time">' + now + ' · 已发送到 Mac 剪贴板</div>';
    hist.insertBefore(div, hist.firstChild);
  }

  albumInput.addEventListener('change', async () => {
    for (const file of albumInput.files) await uploadFile(file);
    albumInput.value = '';
  });

  async function uploadFile(file) {
    const div = document.createElement('div');
    div.className = 'history-item';
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    let preview = '';
    if (file.type.startsWith('image/')) {
      preview = '<img src="' + URL.createObjectURL(file) + '">';
    }

    div.innerHTML = preview +
      file.name + ' (' + fmtSize(file.size) + ')' +
      '<div class="upload-progress"><div class="upload-progress-bar"></div></div>' +
      '<div class="time">' + now + ' · 上传中...</div>';
    hist.insertBefore(div, hist.firstChild);

    const bar = div.querySelector('.upload-progress-bar');

    try {
      const b64 = await toBase64(file);
      bar.style.width = '50%';

      const res = await fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: b64, type: file.type })
      });

      if (res.ok) {
        const r = await res.json();
        bar.style.width = '100%';
        div.querySelector('.time').textContent = now + ' · 已保存到 ' + r.path;
        setTimeout(() => { const p = div.querySelector('.upload-progress'); if (p) p.remove(); }, 1000);
      } else {
        div.querySelector('.time').textContent = now + ' · 上传失败';
      }
    } catch (e) {
      div.querySelector('.time').textContent = now + ' · 上传失败，检查连接';
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

  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }

  btn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
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
