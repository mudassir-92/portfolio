/* Build-time generator for config.js (EmailJS).
   Netlify: set environment variables in Site settings -> Environment variables.
   Local: run with env vars set, e.g.
     EMAILJS_PUBLIC_KEY=... EMAILJS_SERVICE_ID=... node scripts/gen-config.js
*/

const fs = require('fs');
const path = require('path');

function loadDotEnvIfPresent() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const s = String(line || '').trim();
    if (!s || s.startsWith('#')) return;
    const idx = s.indexOf('=');
    if (idx <= 0) return;
    const key = s.slice(0, idx).trim();
    let val = s.slice(idx + 1).trim();
    // Strip simple wrapping quotes.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!key) return;
    if (process.env[key] === undefined) process.env[key] = val;
  });
}

function readEnv(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

loadDotEnvIfPresent();

const cfg = {
  EMAILJS_PUBLIC_KEY: readEnv('EMAILJS_PUBLIC_KEY'),
  // These IDs aren't secrets, but you can still override them via env vars.
  EMAILJS_SERVICE_ID: readEnv('EMAILJS_SERVICE_ID', 'service_rb59o9a'),
  EMAILJS_CONTACT_TEMPLATE_ID: readEnv('EMAILJS_CONTACT_TEMPLATE_ID', 'template_cd2eg9j'),
  EMAILJS_AUTOREPLY_TEMPLATE_ID: readEnv('EMAILJS_AUTOREPLY_TEMPLATE_ID', 'template_xuppqc6')
};

const outPath = path.join(process.cwd(), 'config.js');

// Generate a tiny browser global. This is client-side, so do not put secrets here.
const contents =
  `window.CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;

fs.writeFileSync(outPath, contents, 'utf8');
console.log(`wrote ${outPath}`);
