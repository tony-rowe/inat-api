import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(__dirname, '..', 'certs');
const LE_CERT_DIR = '/etc/letsencrypt/live';

function getCertPaths() {
  const domain = process.env.DOMAIN;
  if (domain) {
    const lePath = path.join(LE_CERT_DIR, domain);
    if (fs.existsSync(path.join(lePath, 'fullchain.pem'))) {
      return {
        key: path.join(lePath, 'privkey.pem'),
        cert: path.join(lePath, 'fullchain.pem'),
        source: 'letsencrypt'
      };
    }
  }

  const selfSigned = path.join(CERT_DIR, 'server.key');
  if (fs.existsSync(selfSigned)) {
    return {
      key: selfSigned,
      cert: path.join(CERT_DIR, 'server.crt'),
      source: 'self-signed'
    };
  }

  return null;
}

function generateSelfSignedCerts() {
  if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

  const keyPath = path.join(CERT_DIR, 'server.key');
  const certPath = path.join(CERT_DIR, 'server.crt');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('Self-signed certs already exist.');
    return { key: keyPath, cert: certPath };
  }

  console.log('Generating self-signed TLS certificates...');
  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" ` +
      `-days 365 -nodes -subj "/CN=localhost/O=PNW-Mushroom-Dashboard"`,
      { stdio: 'pipe' }
    );
    console.log('Self-signed certs generated successfully.');
    return { key: keyPath, cert: certPath };
  } catch (err) {
    console.error('Failed to generate self-signed certs:', err.message);
    return null;
  }
}

function loadCerts() {
  let paths = getCertPaths();

  if (!paths) {
    const generated = generateSelfSignedCerts();
    if (generated) {
      paths = { ...generated, source: 'self-signed' };
    }
  }

  if (!paths) return null;

  try {
    return {
      key: fs.readFileSync(paths.key),
      cert: fs.readFileSync(paths.cert),
      source: paths.source
    };
  } catch (err) {
    console.error('Failed to load certs:', err.message);
    return null;
  }
}

export { loadCerts, generateSelfSignedCerts, getCertPaths };
