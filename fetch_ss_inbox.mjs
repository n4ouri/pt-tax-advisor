import fs from 'fs';
import { execSync } from 'child_process';

function fetchUrl(url) {
  try {
    const cmd = `curl -s -b ss_cookies.txt -c ss_cookies.txt -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${url}"`;
    return execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e.message);
    return null;
  }
}

// 1. Fetch inbox
const inboxJson = fetchUrl('https://www.seg-social.pt/ptss/rest/fraw/mensagens/inbox');
fs.writeFileSync('ss_inbox.json', inboxJson || '[]');

try {
  const msgs = JSON.parse(inboxJson);
  console.log(`\n=== INBOX (${msgs.length} mensagens) ===`);
  msgs.forEach((m, idx) => {
    const date = new Date(m.dataEntrega).toISOString().split('T')[0];
    const text = (m.conteudo || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`[#${idx + 1}] Data: ${date} | Id: ${m.id} | Estado: ${m.estado}`);
    console.log(`     ${text}\n`);
  });
} catch (e) {
  console.error('Error parsing inbox:', e);
}
