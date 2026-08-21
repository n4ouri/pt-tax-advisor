import fs from 'fs';
import { execSync } from 'child_process';

const services = [
  { name: 'carreira_contributiva', url: 'https://www.seg-social.pt/ptss/cci/carreiraContributiva/consultar_carreira_ss' },
  { name: 'gestao_bancaria', url: 'https://www.seg-social.pt/ptss/ci/gestao-bancaria' },
  { name: 'contactos', url: 'https://www.seg-social.pt/ptss/gus/gestao-atualizacao-contactos/consultar-contactos' },
  { name: 'prestacoes_apoios', url: 'https://www.seg-social.pt/ptss/sicc/declaracao-prestacoes-apoios' },
  { name: 'eclic', url: 'https://www.seg-social.pt/ptss/gac/consultar-pedido' },
  { name: 'rendimentos_consulta', url: 'https://www.seg-social.pt/ptss/grend/rendimento/consulta' }
];

for (const s of services) {
  try {
    const cmd = `curl -s -L -b ss_cookies.txt -c ss_cookies.txt -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${s.url}"`;
    const res = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(`ss_${s.name}.html`, res || '');
    
    const cleanText = (res || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.includes('window.PrimeFaces') && !l.includes('gtag') && !l.includes('Sess&atilde;o expirada') && !l.includes('Prolongar'));
    
    console.log(`\n========================================`);
    console.log(`SERVICE: ${s.name} (${res.length} bytes)`);
    console.log(`========================================`);
    console.log(cleanText.slice(0, 40).join('\n'));
  } catch (e) {
    console.error(`Error on ${s.name}:`, e.message);
  }
}
