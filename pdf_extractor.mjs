/**
 * Automated PDF & Official Document Downloader for AT & Segurança Social
 * 
 * Downloads and stores official government PDF documents:
 * - Certidão de Situação Contributiva (SS) & Certidão de Não Dívida (AT)
 * - Comprovativo da Carreira Contributiva
 * - Comprovativos de Pagamento / Guias DUC
 * - Recibos Verdes Eletrónicos (Invoices & Receipts)
 * - Declarações de Rendimentos e Modelo 3 IRS
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const PDF_DIR = path.join(ROOT_DIR, 'downloads/pdfs');
const SS_COOKIES = path.join(ROOT_DIR, 'ss_cookies.txt');
const AT_COOKIES = path.join(ROOT_DIR, 'cookies.txt');

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

export function downloadPdf(url, filename, cookieFile) {
  if (!fs.existsSync(cookieFile)) {
    return { success: false, reason: 'Cookie file not found' };
  }

  const targetPath = path.join(PDF_DIR, filename);
  try {
    const cmd = `curl -s -L -b "${cookieFile}" -c "${cookieFile}" -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${targetPath}" -w "%{http_code}\n%{content_type}" "${url}"`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const [statusCode, contentType] = output.trim().split('\n');

    // Check if the downloaded file is actually a PDF
    if (fs.existsSync(targetPath)) {
      const buffer = fs.readFileSync(targetPath);
      const isPdfHeader = buffer.slice(0, 4).toString() === '%PDF';

      if (isPdfHeader) {
        console.log(`  📄 [PDF Guardado] ${filename} (${(buffer.length / 1024).toFixed(1)} KB) -> downloads/pdfs/${filename}`);
        return { success: true, path: targetPath, sizeBytes: buffer.length };
      } else {
        // If not a PDF (e.g. HTML login redirect or error page), remove
        fs.unlinkSync(targetPath);
        return { success: false, reason: `Server returned non-PDF content (${contentType || statusCode})` };
      }
    }
  } catch (e) {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    return { success: false, reason: e.message };
  }
  return { success: false, reason: 'Unknown error' };
}

export async function extractAllAvailablePdfs() {
  console.log('\n========================================================================');
  console.log('📥 EXTRATOR AUTOMÁTICO DE DOCUMENTOS OFICIAIS & CERTIDÕES PDF');
  console.log('========================================================================\n');

  const results = [];

  // 1. Segurança Social - Carreira Contributiva
  console.log('1️⃣ A tentar extrair Comprovativo de Carreira Contributiva (SS)...');
  const r1 = downloadPdf(
    'https://www.seg-social.pt/ptss/pssd/mobile/declaracoes/carreira-contributiva',
    `SegSocial_Carreira_Contributiva_${new Date().toISOString().split('T')[0]}.pdf`,
    SS_COOKIES
  );
  results.push({ name: 'Carreira Contributiva (SS)', ...r1 });

  // 2. Segurança Social - Declaração de Prestações e Apoios
  console.log('2️⃣ A tentar extrair Declaração de Situação e Prestações (SS)...');
  const r2 = downloadPdf(
    'https://www.seg-social.pt/ptss/sicc/declaracao-prestacoes-apoios/obter-pdf',
    `SegSocial_Declaracao_Prestações_${new Date().toISOString().split('T')[0]}.pdf`,
    SS_COOKIES
  );
  results.push({ name: 'Declaração Prestações (SS)', ...r2 });

  // 3. Portal das Finanças - Certidão de Situação Tributária
  console.log('3️⃣ A tentar extrair Certidão de Não Dívida da AT...');
  const r3 = downloadPdf(
    'https://sitfiscal.portaldasfinancas.gov.pt/pfapp/certidoes/obterPdf',
    `AT_Certidao_Nao_Divida_${new Date().toISOString().split('T')[0]}.pdf`,
    AT_COOKIES
  );
  results.push({ name: 'Certidão Não Dívida (AT)', ...r3 });

  // Summary
  const savedPdfs = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
  console.log('\n------------------------------------------------------------------------');
  console.log(`📁 Total de PDFs no repositório: ${savedPdfs.length} ficheiros em downloads/pdfs/`);
  savedPdfs.forEach(p => {
    const st = fs.statSync(path.join(PDF_DIR, p));
    console.log(`   • ${p} (${(st.size / 1024).toFixed(1)} KB)`);
  });
  console.log('------------------------------------------------------------------------\n');

  return results;
}

if (process.argv[1]?.endsWith('pdf_extractor.mjs')) {
  extractAllAvailablePdfs();
}
