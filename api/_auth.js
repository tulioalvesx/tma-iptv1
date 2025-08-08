// api/_auth.js
function requireBasicAuth(req, res) {
  const userEnv = (process.env.ADMIN_USER || '').trim(); // trim user
  const passEnv = (process.env.ADMIN_PASS || '');        // não trime a senha

  const header = req.headers['authorization'] || '';

  if (!userEnv || !passEnv) {
    res.statusCode = 500;
    res.json({ error: 'ADMIN_USER/ADMIN_PASS envs not configured' });
    return false;
  }

  if (!header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="admin"');
    res.statusCode = 401;
    res.end('Authentication required.');
    return false;
  }

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const u = (idx >= 0 ? decoded.slice(0, idx) : decoded).trim();
    const p = idx >= 0 ? decoded.slice(idx + 1) : '';

    if (u !== userEnv || p !== passEnv) {
      res.statusCode = 401;
      res.end('Invalid credentials.');
      return false;
    }
    return true;
  } catch {
    res.statusCode = 400;
    res.end('Bad Authorization header.');
    return false;
  }
}
module.exports = { requireBasicAuth };
