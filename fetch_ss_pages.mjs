import fs from 'fs';
import { execSync } from 'child_process';

const urls = [
  { name: 'posicao_atual', url: 'https://www.seg-social.pt/ptss/ci/posicao-atual/posicao-atual' },
  { name: 'situacao_contributiva', url: 'https://www.seg-social.pt/ptss/ascd/pesquisa-entidade' },
  { name: 'planos_execucao', url: 'https://www.seg-social.pt/ptss/sef/planos/consulta-planos-prestacionais' },
  { name: 'notificacoes_execucao', url: 'https://www.seg-social.pt/ptss/sef/notificacoes/consulta-notificacoes' },
  { name: 'declaracao_trimestral', url: 'https://www.seg-social.pt/ptss/declaracao-trimestral' },
  { name: 'carreira_contributiva', url: 'https://www.seg-social.pt/ptss/carreira-contributiva' },
  { name: 'remuneracoes', url: 'https://www.seg-social.pt/ptss/remuneracoes' },
  { name: 'dados_pessoais', url: 'https://www.seg-social.pt/ptss/dados-pessoais' }
];

for (const target of urls) {
  try {
    const cmd = `curl -s -L -b ss_cookies.txt -c ss_cookies.txt -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${target.url}"`;
    const res = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(`ss_${target.name}.html`, res || '');
    
    // Clean text summary
    const cleanText = (res || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.includes('window.PrimeFaces') && !l.includes('gtag'));
    
    console.log(`\n========================================`);
    console.log(`TARGET: ${target.name} (${res.length} bytes)`);
    console.log(`========================================`);
    console.log(cleanText.slice(0, 35).join('\n'));
  } catch (e) {
    console.error(`Error fetching ${target.name}:`, e.message);
  }
}
