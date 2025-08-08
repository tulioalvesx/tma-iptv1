// api/upload-image.js
// Accepts multipart/form-data with field name "file" and optional "prefix"
// Uploads to Supabase Storage bucket "images" and returns the public URL.

const { getSupabaseServer } = require('./_supabase');
const { enableCORS } = require('./_utils');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

module.exports = async (req, res) => {
  enableCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseServer();

  const form = formidable({
    multiples: false,
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('formidable error', err);
      return res.status(400).json({ error: 'Invalid form data' });
    }
    const file = files.file;
    if (!file) return res.status(400).json({ error: 'file is required' });

    const prefix = (fields.prefix && String(fields.prefix)) || 'uploads';
    const filename = `${Date.now()}_${path.basename(file.originalFilename || file.newFilename || 'file')}`;
    const storagePath = `${prefix}/${filename}`;

    try {
      const buffer = fs.readFileSync(file.filepath);
      const { error: upErr } = await supabase
        .storage
        .from('images')
        .upload(storagePath, buffer, { contentType: file.mimetype, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('images').getPublicUrl(storagePath);
      return res.status(200).json({ url: pub.publicUrl, path: storagePath });
    } catch (e) {
      console.error('upload-image error', e);
      return res.status(500).json({ error: String(e.message || e) });
    }
  });
}
