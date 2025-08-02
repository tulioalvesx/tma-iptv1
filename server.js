const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Basic MIME types for static file serving
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// Hard‑coded admin credentials. In a real world system this would be stored securely.
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'password';

// Path helpers for data storage
const dataDir = path.join(__dirname, 'data');
const productsPath = path.join(dataDir, 'products.json');
const downloadsPath = path.join(dataDir, 'downloads.json');

/**
 * Helper to read JSON data from disk. If the file does not exist it returns
 * a sensible default value.
 * @param {string} filePath
 * @param {any} defaultValue
 */
function readJson(filePath, defaultValue) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return defaultValue;
  }
}

/**
 * Helper to write JSON data to disk.
 * @param {string} filePath
 * @param {any} data
 */
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Parse POST bodies. Supports application/json and application/x-www-form-urlencoded.
 * Returns a Promise that resolves with the parsed body.
 * @param {http.IncomingMessage} req
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (e) {
          resolve({});
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body);
        const result = {};
        for (const [key, value] of params.entries()) {
          result[key] = value;
        }
        resolve(result);
      } else {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * Authenticate admin login. Returns true if username/password match.
 * @param {string} username
 * @param {string} password
 */
function authenticate(username, password) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Handles API requests. Supports GET and POST for products and downloads
 * and GET for chat. Also supports login authentication.
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleApi(req, res) {
  const { pathname, query } = url.parse(req.url, true);
  // Enable CORS for API endpoints
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (pathname === '/api/products') {
    if (req.method === 'GET') {
      const products = readJson(productsPath, { groups: [] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(products));
      return;
    } else if (req.method === 'POST') {
      const data = await parseBody(req);
      // Save the posted products; expects JSON structure { groups: [...] }
      writeJson(productsPath, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
  }
  if (pathname === '/api/downloads') {
    if (req.method === 'GET') {
      const downloads = readJson(downloadsPath, { files: [] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(downloads));
      return;
    } else if (req.method === 'POST') {
      const data = await parseBody(req);
      writeJson(downloadsPath, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
  }
  if (pathname === '/api/login' && req.method === 'POST') {
    const data = await parseBody(req);
    const { username, password } = data;
    const ok = authenticate(username, password);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: ok }));
    return;
  }
  if (pathname === '/api/chat' && req.method === 'GET') {
    // Simple chatbot implementation. Optionally call external API.
    const message = query.message || '';
    let reply;
    // Basic keyword matching for demonstration
    if (!message || message.trim() === '') {
      reply = 'Olá! Como posso ajudar?';
    } else if (/olá|bom dia|boa tarde|boa noite/i.test(message)) {
      reply = 'Olá! Em que posso ajudar?';
    } else if (/preço|valor/i.test(message)) {
      reply = 'Os preços estão listados no nosso catálogo na página de produtos.';
    } else {
      reply = 'Desculpe, não entendi. Poderia reformular a pergunta?';
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply }));
    return;
  }
  // Fallback for unknown API
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Serves static files from the public directory.
 * @param {string} filepath
 * @param {http.ServerResponse} res
 */
function serveStatic(filepath, res) {
  fs.readFile(filepath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      const ext = path.extname(filepath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Main HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  // Route API calls
  if (pathname.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }
  // Map root path to index.html
  let filePath = path.join(__dirname, 'public', pathname);
  if (pathname === '/' || pathname === '') {
    filePath = path.join(__dirname, 'public', 'index.html');
  }
  // If the path resolves to a directory, look for an index.html in that directory
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (err) {
    // File not found; will be handled in serveStatic
  }
  serveStatic(filePath, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});