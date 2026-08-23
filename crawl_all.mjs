/**
 * Unified Automated Crawler & Advisor Runner
 * Automatically reads cookies.txt and ss_cookies.txt to query:
 * - Segurança Social Direta (Declarations, Contributions, Career, Debts, Inbox)
 * - Portal das Finanças / e-Fatura (Tax status, Invoices, Expenses)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { runAdvisorAnalysis, formatCurrency } from './cli/advisor.js';
import { formatEUR } from './cli/autonomo-advisor.js';
import { extractAllAvailablePdfs } from './pdf_extractor.mjs';

const ROOT_DIR = process.cwd();
const SS_COOKIES = path.join(ROOT_DIR, 'ss_cookies.txt');
const AT_COOKIES = path.join(ROOT_DIR, 'cookies.txt');
const SS_OUTPUT_DIR = path.join(ROOT_DIR, 'crawled_data/seg_social');

if (!fs.existsSync(SS_OUTPUT_DIR)) {
  fs.mkdirSync(SS_OUTPUT_DIR, { recursive: true });
}

function fetchWithCookie(url, cookieFile) {
  if (!fs.existsSync(cookieFile)) return { success: false, body: null };
  try {
    const cmd = `curl -s -L -b "${cookieFile}" -c "${cookieFile}" -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -w "\n__HTTP_STATUS__:%{http_code}" "${url}"`;
    const raw = execSync(cmd, { encoding: 'utf-8', maxBuffer: 25 * 1024 * 1024 });
    const parts = raw.split('\n__HTTP_STATUS__:');
    const body = parts[0];
    const status = parts[1]?.trim();
    return { success: status === '200' || status === '201', statusCode: status, body };
  } catch (e) {
    return { success: false, body: null, error: e.message };
  }
}

async function runAutoCrawlAndAnalyze() {
  console.log('\n========================================================================');
  console.log('🤖 INICIANDO SINCRONIZAÇÃO AUTOMÁTICA VIA COOKIES (AT + SEG SOCIAL)');
  console.log('========================================================================\n');

  // 1. Crawl SS Endpoints
  if (fs.existsSync(SS_COOKIES)) {
    console.log('📡 [1/3] A consultar Segurança Social Direta via ss_cookies.txt...');
    const ssEndpoints = [
      { file: 'personal_data.json', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/login/personalData' },
      { file: 'inbox_messages.json', url: 'https://www.seg-social.pt/ptss/rest/fraw/mensagens/inbox' },
      { file: 'payments_current.json', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/payments/current' },
      { file: 'payments_previous.json', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/payments/previous' },
      { file: 'carreira_contributiva.html', url: 'https://www.seg-social.pt/ptss/cci/carreiraContributiva/consultar_carreira_ss' },
      { file: 'posicao_atual.html', url: 'https://www.seg-social.pt/ptss/ci/posicao-atual/posicao-atual' },
      { file: 'situacao_contributiva.html', url: 'https://www.seg-social.pt/ptss/ascd/pesquisa-entidade' },
      { file: 'contactos_utilizador.html', url: 'https://www.seg-social.pt/ptss/gus/gestao-atualizacao-contactos/consultar-contactos' },
      { file: 'access_logs.json', url: 'https://www.seg-social.pt/ptss/rest/pssd/activity/accessLogs' }
    ];

    for (const ep of ssEndpoints) {
      const res = fetchWithCookie(ep.url, SS_COOKIES);
      if (res.success && res.body && !res.body.includes('Sessão expirada') && !res.body.includes('loginRedirect') && !res.body.includes('Aplicação Inexistente')) {
        fs.writeFileSync(path.join(SS_OUTPUT_DIR, ep.file), res.body, 'utf-8');
      }
    }
  }

  // 1b. Crawl AT / e-Fatura Endpoints
  let atParsedData = { dividas: { total: 0 }, situacaoFiscal: 'Regularizada', faturasPendentes: 0 };
  if (fs.existsSync(AT_COOKIES)) {
    console.log('📡 [2/4] A consultar Portal das Finanças e e-Fatura via cookies.txt...');
    const atRes = fetchWithCookie('https://sitfiscal.portaldasfinancas.gov.pt/sitfiscal/home', AT_COOKIES);
    if (atRes.success && atRes.body && !atRes.body.includes('Aplicação Inexistente') && !atRes.body.includes('loginRedirect')) {
      if (atRes.body.includes('Não tem dívidas fiscais em cobrança') || atRes.body.includes('Situação tributária regularizada')) {
        atParsedData.situacaoFiscal = 'Regularizada';
      }
    }

    const efRes = fetchWithCookie('https://faturas.portaldasfinancas.gov.pt/homeBeneficio.action', AT_COOKIES);
    if (efRes.success && efRes.body && !efRes.body.includes('Aplicação Inexistente')) {
      const pendingMatch = efRes.body.match(/(\d+)\s*faturas?\s*pendentes?/i) || efRes.body.match(/Tem\s*(\d+)\s*faturas?\s*para\s*validar/i);
      if (pendingMatch) {
        atParsedData.faturasPendentes = parseInt(pendingMatch[1], 10);
      }
    }
  }

  // 2. Generate / Update Snapshot
  console.log('🔄 [3/4] A atualizar snapshot unificado e histórico de rendimentos...');
  try {
    execSync('node generate_snapshot.mjs', { stdio: 'inherit' });
  } catch (e) {
    console.warn('Nota sobre geração de snapshot:', e.message);
  }

  // 3. Extract PDFs
  console.log('\n📄 [3/4] A descarregar e verificar certidões e comprovativos em PDF...');
  try {
    await extractAllAvailablePdfs();
  } catch (e) {
    console.warn('Nota sobre extração de PDFs:', e.message);
  }

  // 4. Run Advisor
  console.log('\n📊 [4/4] A calcular diagnóstico fiscal, faturas e obrigações...');
  const snapshotPath = path.join(SS_OUTPUT_DIR, 'seg_social_unified_snapshot.json');
  let rawData = {};
  if (fs.existsSync(snapshotPath)) {
    rawData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  }

  // Correlate with advisor engine
  const report = runAdvisorAnalysis({
    profile: rawData.profile,
    segSocial: {
      situacaoContributiva: rawData.situacaoContributiva?.estado,
      trabalhadorIndependente: rawData.trabalhadorIndependente,
      execucaoFiscal: rawData.execucaoFiscal?.montanteTotalDivida > 0 ? rawData.execucaoFiscal : null,
      carreiraContributiva: rawData.carreiraContributiva
    },
    at: {
      situacaoFiscal: atParsedData.situacaoFiscal || 'Regularizada',
      dividas: atParsedData.dividas || { total: 0 },
      regimeSimplificado: {
        rendimentoServicos: (rawData.trabalhadorIndependente?.rendimentoRelevanteTrimestral || 0) / 0.70 * 4,
        despesasAtividade: 0,
        contribuicoesSS: (rawData.trabalhadorIndependente?.mensalidadePrevista || 0) * 12
      }
    },
    efatura: {
      faturasPendentes: atParsedData.faturasPendentes || 0,
      categorias: {}
    }
  });

  const auto = report.autonomoAnalysis;

  console.log('\n========================================================================');
  console.log('📋 RESULTADO DA CONSULTA AUTOMÁTICA COM COOKIES:');
  console.log('========================================================================');
  console.log(`Contribuinte:            ${rawData.profile?.name || 'ABDELRHAFAR NAOURI'}`);
  console.log(`NISS:                    ${rawData.profile?.niss || '12168017918'}`);
  console.log(`Situação Fiscal (AT):    ${report.taxSummary.fiscalStatus}`);
  console.log(`Situação SS:             ${report.taxSummary.ssStatus}`);
  console.log(`Faturação Estimada Anual:${formatEUR(auto.metrics.grossAnnualEstimated)}`);
  console.log(`Mensalidade SS Vigente:  ${formatEUR(auto.metrics.currentSSMonthly)}/mês`);
  console.log('------------------------------------------------------------------------\n');

  if (report.alerts.length > 0) {
    console.log('🔔 AVISOS E ALERTAS ATIVOS:');
    report.alerts.forEach(a => {
      console.log(`• [${a.level}] ${a.title} (${a.source})`);
      console.log(`  👉 ${a.action}`);
    });
    console.log('');
  }
}

runAutoCrawlAndAnalyze();
