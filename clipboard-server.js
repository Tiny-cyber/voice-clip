const http = require('http');
const { execSync } = require('child_process');
const os = require('os');

const PORT = 5678;

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
  .input-area {
    display: flex;
    gap: 8px;
    padding-bottom: env(safe-area-inset-bottom, 10px);
  }
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
</style>
</head>
<body>
  <div class="status"><span class="dot"></span>Connected to Mac</div>
  <div class="history" id="history"></div>
  <div class="input-area">
    <input type="text" id="textInput" placeholder="Type or use voice keyboard..." autocomplete="off" autofocus>
    <button id="sendBtn">Send</button>
  </div>
<script>
  const input = document.getElementById('textInput');
  const btn = document.getElementById('sendBtn');
  const history = document.getElementById('history');

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
      alert('Send failed. Check WiFi connection.');
    }
    btn.disabled = false;
  }

  function addHistory(text) {
    const div = document.createElement('div');
    div.className = 'history-item';
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = text + '<div class="time">' + now + ' · Sent to Mac clipboard</div>';
    history.insertBefore(div, history.firstChild);
  }

  btn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });

  // Auto focus on load
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
          // Write to Mac clipboard via osascript (works from LaunchAgent)
          execSync(`osascript -e 'set the clipboard to "${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"'`);
          const preview = text.substring(0, 60).replace(/\n/g, '\\n');
          const ts = new Date().toISOString();
          console.log(`[${ts}] Received: ${preview}`);
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

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`voice-clip server started`);
  console.log(`Local:   http://127.0.0.1:${PORT}`);
  console.log(`iPhone:  http://${ip}:${PORT}`);
  console.log(`\nWaiting for connections...`);
});
