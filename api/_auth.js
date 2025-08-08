// api/_auth.js
// Basic Auth for admin endpoints. Set ADMIN_USER and ADMIN_PASS on Vercel.

function requireBasicAuth(req, res) {
  const user = process.env.ADMIN_USER || '';
  const pass = process.env.ADMIN_PASS || '';
  const header = req.headers['authorization'] || '';

  if (!user || !pass) {
    res.statusCode = 500;
    res.json({ error: "ADMIN_USER/ADMIN_PASS envs not configured" });
    return false;
  }

  if (!header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="admin"');
    res.statusCode = 401;
    res.end('Authentication required.');
    return false;
  }

  const decoded = Buffer.from(header.slice(6), 'base64').toString();
  const [u, p] = decoded.split(':');
  if (u !== user || p !== pass) {
    res.statusCode = 401;
    res.end('Invalid credentials.');
    return false;
  }
  return true;
}

module.exports = { requireBasicAuth };
