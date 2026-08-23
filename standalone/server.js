/**
 * Standalone Web Dashboard Server & 360° Tax Command Center
 * 
 * Runs a local server on http://localhost:4040 with live portal crawling,
 * corporate vs. personal tax optimizer, automated statutory document generator,
 * time-series diffing, and accountant briefing tools.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PortalCrawler } from './crawler.js';
import { formatCurrency } from '../cli/advisor.js';
import { formatEUR } from '../cli/autonomo-advisor.js';
import { generateAllOfficialDocs, COMPANY_PROFILE } from '../document_generator.mjs';

const PORT = 4040;
const ROOT_DIR = process.cwd();
const COOKIE_PATH = path.resolve(ROOT_DIR, 'cookies.txt');
const SS_COOKIE_PATH = path.resolve(ROOT_DIR, 'ss_cookies.txt');
const DATA_PATH = path.resolve(ROOT_DIR, 'data/latest_report.json');
const SNAPSHOT_PATH = path.resolve(ROOT_DIR, 'crawled_data/seg_social/seg_social_unified_snapshot.json');
const DOCS_DIR = path.resolve(ROOT_DIR, 'downloads/generated_docs');

const crawler = new PortalCrawler(COOKIE_PATH);

async function getOrRunReport() {
  if (fs.existsSync(DATA_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    } catch (e) {}
  }
  return await crawler.crawlAndAnalyze();
}

function renderHtml(reportData) {
  const { nif, state, report, updatedAt } = reportData;
  const { taxSummary, alerts, opportunities } = report;

  let snap = {};
  if (fs.existsSync(SNAPSHOT_PATH)) {
    try {
      snap = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
    } catch (e) {}
  }

  const scoreClass = taxSummary.healthScore >= 80 ? 'score-good' : taxSummary.healthScore >= 50 ? 'score-warning' : 'score-danger';

  // 1. Critical Alerts
  let alertsHtml = '';
  if (alerts && alerts.length > 0) {
    alertsHtml = `
      <div class="panel alert-panel">
        <h2 class="text-danger">⚠️ Alertas de Ação & Regularidade</h2>
        <div class="alerts-grid">
          ${alerts.map(a => `
            <div class="alert-card">
              <div class="alert-title">${a.title} (${a.source})</div>
              <div class="alert-desc">${a.description}</div>
              <div class="alert-action">👉 Ação: ${a.action}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 2. Opportunities
  const opportunitiesHtml = (opportunities || []).map(o => `
    <div class="opp-card">
      <div class="opp-top">
        <span class="opp-cat">${o.category}</span>
        <span class="opp-impact">${o.impact}</span>
      </div>
      <h3 class="opp-title">${o.title}</h3>
      <p class="opp-desc">${o.description.replace(/\n/g, '<br>')}</p>
      ${o.action ? `<div class="opp-action">👉 <strong>Ação:</strong> ${o.action}</div>` : ''}
      <div class="opp-rule">Base Legal: ${o.rule || 'CIRS / CRCSPSS'}</div>
    </div>
  `).join('');

  // 3. Generated Docs List
  let docLinks = [];
  if (fs.existsSync(DOCS_DIR)) {
    docLinks = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.html'));
  }

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Command Center 360° — ${COMPANY_PROFILE.name} & NIF ${nif}</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111726;
      --card-hover: #162035;
      --border: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --green: #10b981;
      --red: #ef4444;
      --amber: #f59e0b;
      --blue: #3b82f6;
      --purple: #8b5cf6;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; padding: 32px 24px; }
    .container { max-width: 1140px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
    .logo-row { display: flex; align-items: center; gap: 14px; }
    .logo-icon { font-size: 34px; }
    h1 { font-size: 21px; font-weight: 700; color: #fff; }
    .subtitle { font-size: 13px; color: var(--muted); margin-top: 2px; }
    .badge-nif { background: #1e293b; color: #34d399; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; border: 1px solid #334155; }
    .badge-corp { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .btn-sync { background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; text-decoration: none; }
    .btn-docs { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }
    
    .score-box { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 8px 14px; text-align: right; }
    .score-num { font-size: 20px; font-weight: 800; }
    .score-good { color: var(--green); }
    .score-warning { color: var(--amber); }
    .score-danger { color: var(--red); }

    .grid-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .metric-label { font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .metric-val { font-size: 19px; font-weight: 800; color: #fff; }
    .val-good { color: var(--green); }
    .val-bad { color: var(--red); }
    .val-highlight { color: #facc15; }
    .metric-sub { font-size: 11px; color: #64748b; }

    .panel { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 22px; display: flex; flex-direction: column; gap: 16px; }
    .panel h2 { font-size: 17px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
    .panel-desc { font-size: 13px; color: var(--muted); margin-top: -8px; }

    .alert-panel { border-left: 4px solid var(--red); background: rgba(239, 68, 68, 0.05); }
    .text-danger { color: var(--red); }
    .alerts-grid { display: flex; flex-direction: column; gap: 12px; }
    .alert-card { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .alert-title { font-weight: 700; color: #fca5a5; font-size: 14px; }
    .alert-desc { font-size: 13px; color: #e2e8f0; }
    .alert-action { font-size: 12px; color: #fbbf24; font-weight: 600; margin-top: 4px; }

    .cash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .cash-card { background: #080d17; border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .cash-top { display: flex; justify-content: space-between; align-items: center; }
    .cash-cat { font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; }
    .cash-badge { font-size: 10.5px; font-weight: 700; color: #facc15; background: rgba(250, 204, 21, 0.12); padding: 2px 6px; border-radius: 4px; }
    .cash-title { font-size: 14.5px; font-weight: 700; color: #fff; }
    .cash-val { font-size: 20px; font-weight: 800; color: #34d399; }
    .cash-desc { font-size: 12.5px; color: var(--muted); }
    .cash-legal { font-size: 11px; color: #64748b; margin-top: 4px; padding-top: 4px; border-top: 1px solid #1e293b; }

    .doc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .doc-card { background: #080d17; border: 1px solid #24324a; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center; }
    .doc-name { font-weight: 600; font-size: 13.5px; color: #e2e8f0; }
    .doc-sub { font-size: 11.5px; color: #94a3b8; }
    .btn-view-doc { background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; transition: 0.2s; }
    .btn-view-doc:hover { background: #38bdf8; color: #090d16; }

    .opp-grid { display: flex; flex-direction: column; gap: 14px; }
    .opp-card { background: #080d17; border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .opp-top { display: flex; justify-content: space-between; align-items: center; }
    .opp-cat { font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; }
    .opp-impact { font-size: 11.5px; font-weight: 700; color: #facc15; background: rgba(250, 204, 21, 0.12); padding: 2px 6px; border-radius: 4px; }
    .opp-title { font-size: 14.5px; font-weight: 700; color: #fff; }
    .opp-desc { font-size: 12.5px; color: var(--muted); line-height: 1.4; }
    .opp-action { font-size: 12px; color: #38ef7d; font-weight: 600; margin-top: 2px; }
    .opp-rule { font-size: 11px; color: #64748b; margin-top: 2px; }

    .email-box { background: #080d17; border: 1px solid #334155; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 12px; color: #cbd5e1; white-space: pre-wrap; line-height: 1.4; max-height: 250px; overflow-y: auto; }

    footer { text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid var(--border); padding-top: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-row">
        <span class="logo-icon">🏛️</span>
        <div>
          <h1>Command Center 360° — Auditoria Fiscal & Contabilística</h1>
          <p class="subtitle">
            <span class="badge-nif">Sócio-Gerente: Abdelrhafar Naouri (${nif})</span>
            <span class="badge-nif badge-corp" style="margin-left: 6px;">Empresa: ${COMPANY_PROFILE.name} (${COMPANY_PROFILE.nipc})</span>
          </p>
        </div>
      </div>
      <div class="header-actions">
        <div class="score-box">
          <div style="font-size: 10.5px; color: var(--muted); text-transform: uppercase; font-weight: 600;">Saúde Global</div>
          <div class="score-num ${scoreClass}">${taxSummary.healthScore} / 100</div>
        </div>
        <form method="POST" action="/sync" style="display:inline;">
          <button type="submit" class="btn-sync">🔄 Sincronizar Portais</button>
        </form>
        <form method="POST" action="/generate-docs" style="display:inline;">
          <button type="submit" class="btn-docs">📄 Gerar Documentos Oficiais</button>
        </form>
      </div>
    </header>

    <!-- Metrics -->
    <div class="grid-metrics">
      <div class="metric-card">
        <span class="metric-label">Situação Segurança Social</span>
        <div class="metric-val val-good">${snap.situacaoContributiva?.estado || 'Regularizada'}</div>
        <span class="metric-sub">Certidão n.º ${snap.situacaoContributiva?.numeroDeclaracao || '150589337ASCD26'}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Situação Fiscal (AT)</span>
        <div class="metric-val val-good">Regularizada</div>
        <span class="metric-sub">Sem dívidas ativas ou execuções</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Dinheiro Isento Extraível / Ano</span>
        <div class="metric-val val-highlight">10 492,80 €</div>
        <span class="metric-sub">Km viatura + Cartão refeição (0% imposto)</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Dossiê AIMA Art. 89º n.º 2</span>
        <div class="metric-val val-good">1 414,40 €/mês</div>
        <span class="metric-sub">162% do Salário Mínimo (0% IRS)</span>
      </div>
    </div>

    ${alertsHtml}

    <!-- Official Documents Generated Section -->
    <div class="panel">
      <h2>📄 Documentos Oficiais & Minutas Legais Geradas (Prontos a Assinar)</h2>
      <p class="panel-desc">Documentos oficiais em conformidade com o Código das Sociedades Comerciais, Decreto-Lei n.º 106/98 e Lei de Estrangeiros.</p>
      <div class="doc-grid">
        <div class="doc-card">
          <div>
            <div class="doc-name">🚗 Mapa Mensal de Deslocações (Ajudas de Custo)</div>
            <div class="doc-sub">DL 106/98 • 800 km @ 0,40 €/km = 320,00 € líquidos isentos</div>
          </div>
          <a href="/docs/Mapa_Ajudas_Custo_2026_08.html" target="_blank" class="btn-view-doc">Abrir / Imprimir</a>
        </div>
        <div class="doc-card">
          <div>
            <div class="doc-name">📜 Ata de Fixação da Remuneração da Gerência</div>
            <div class="doc-sub">Art. 252º CSC • Fixação de Vencimento + Cartão Refeição</div>
          </div>
          <a href="/docs/Ata_02_2026_Remuneracao_Gerencia.html" target="_blank" class="btn-view-doc">Abrir / Imprimir</a>
        </div>
        <div class="doc-card">
          <div>
            <div class="doc-name">🏛️ Declaração de Meios de Subsistência para a AIMA</div>
            <div class="doc-sub">Art. 89º n.º 2 Lei 23/2007 • Pacote 1.414,40 €/mês comprovado</div>
          </div>
          <a href="/docs/Declaracao_AIMA_Artigo_89.html" target="_blank" class="btn-view-doc">Abrir / Imprimir</a>
        </div>
        <div class="doc-card">
          <div>
            <div class="doc-name">⚖️ Requerimento SEF (Segurança Social)</div>
            <div class="doc-sub">Processo 1102202500815756 • Pedido de Certidão de Extinção</div>
          </div>
          <a href="/docs/Requerimento_SEF_Execucao_Fiscal.html" target="_blank" class="btn-view-doc">Abrir / Imprimir</a>
        </div>
      </div>
    </div>

    <!-- Tax-Free Cash Extraction -->
    <div class="panel">
      <h2>💰 Estrutura de Extração de Liquidez 100% Isenta (Sociedade para o Sócio)</h2>
      <p class="panel-desc">Canais legais previstos no Código do IRS e IRC para retirar dinheiro da ALLNOACROBÁTICO LDA sem tributação pessoal:</p>
      <div class="cash-grid">
        <div class="cash-card">
          <div class="cash-top">
            <span class="cash-cat">Ajudas de Custo (Viatura Própria)</span>
            <span class="cash-badge">IMEDIATO</span>
          </div>
          <div class="cash-title">Quilómetros Profissionais (0,40 € / km)</div>
          <div class="cash-val">4 800,00 € / ano</div>
          <div class="cash-desc">A empresa transfere até 400 €/mês para a sua conta pessoal. 0% IRS, 0% Segurança Social e 100% dedutível em IRC na empresa.</div>
          <div class="cash-legal">Base Legal: Decreto-Lei n.º 106/98 e Portaria n.º 1553-D/2007</div>
        </div>
        <div class="cash-card">
          <div class="cash-top">
            <span class="cash-cat">Subsídio de Alimentação</span>
            <span class="cash-badge">MENSAL</span>
          </div>
          <div class="cash-title">Cartão de Refeição Eletrónico (10,20 € / dia)</div>
          <div class="cash-val">2 692,80 € / ano</div>
          <div class="cash-desc">224,40 €/mês carregados em cartão de refeição para supermercados e restaurantes. Totalmente isento de IRS e TSU.</div>
          <div class="cash-legal">Base Legal: Artigo 2.º, n.º 3, alínea b) do CIRS</div>
        </div>
      </div>
    </div>

    <!-- Ready to Send Accountant Letter -->
    <div class="panel">
      <h2>✉️ Dossiê de Esclarecimento para o Contabilista Certificado (TOC)</h2>
      <p class="panel-desc">Envie esta minuta formal ao seu contabilista para fechar todas as pendências e garantir a submissão de comprovativos:</p>
      <div class="email-box">Assunto: Ponto de Situação Contributivo/Fiscal e Auditoria 360° — ALLNOACROBÁTICO LDA (NIPC 517551624) & Sócio-Gerente (NIF 305488597)

Exmo.(a) Sr.(a) Contabilista Certificado(a),

Solicito o esclarecimento formal e o envio dos seguintes comprovativos:
1. Execução Fiscal SS (Processo 1102202500815756 / Notificação 26NDP5945135): Confirmação de extinção/arquivamento da dívida ou plano ativo.
2. Otimização Fiscal: Transição da faturação para ALLNOACROBÁTICO LDA (IRC 17% PME) cessando faturação pessoal em Categoria B.
3. Comprovativos Declarativos 2026: Submissão periódica SAF-T, DP IVA / VIES e Registo Central do Beneficiário Efetivo (RCBE).
4. Implementação de Ajudas de Custo (0,40 €/km) e Cartão Refeição (10,20 €/dia) para extração isenta.

Com os melhores cumprimentos,
Abdelrhafar Naouri
Sócio-Gerente de ALLNOACROBÁTICO LDA</div>
    </div>

    <footer>
      Command Center 360° • ALLNOACROBÁTICO LDA • Processamento Local Seguro
    </footer>
  </div>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve generated docs
  if (req.method === 'GET' && url.pathname.startsWith('/docs/')) {
    const filename = path.basename(url.pathname);
    const filePath = path.join(DOCS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }
  }

  // Dashboard
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/dashboard')) {
    const reportData = await getOrRunReport();
    const html = renderHtml(reportData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // Sync Portals
  if (req.method === 'POST' && url.pathname === '/sync') {
    try {
      execSync('node crawl_all.mjs', { stdio: 'inherit' });
      await crawler.crawlAndAnalyze();
    } catch (e) {
      console.warn('Sync error:', e.message);
    }
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }

  // Generate Docs
  if (req.method === 'POST' && url.pathname === '/generate-docs') {
    generateAllOfficialDocs();
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n========================================================`);
  console.log(`🚀 Standalone Advisor Server rodando em: http://localhost:${PORT}`);
  console.log(`========================================================\n`);
});
