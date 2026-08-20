const http = require('http');
const https = require('https');

function startSelfKeepAlive() {
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (!renderUrl) return;

  // Ping /api/ping every 10 minutes to prevent Render idle sleeping
  setInterval(() => {
    try {
      const client = renderUrl.startsWith('https') ? https : http;
      client.get(`${renderUrl}/api/ping`, (res) => {}).on('error', () => {});
    } catch (e) {}
  }, 10 * 60 * 1000);
}

module.exports = startSelfKeepAlive;
