/**
 * Standalone Web Dashboard Server (Zero Extension Required)
 * 
 * Runs a local server on http://localhost:4040 with live portal crawling,
 * time-series diffing, deduction optimization recommendations, and cookie updates.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { PortalCrawler } from './crawler.js';
import { formatCurrency } from '../cli/advisor.js';

const PORT = 4040;
const COOKIE_PATH = path.resolve(process.cwd(), 'pt-tax-advisor/cookies.txt');
const DATA_PATH = path.resolve(process.cwd(), 'pt-tax-advisor/data/latest_report.json');

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

  const scoreClass = taxSummary.healthScore >= 80 ? 'score-good' : taxSummary.healthScore >= 50 ? 'score-warning' : 'score-danger';

  let alertsHtml = '';
  if (alerts && alerts.length > 0) {
    alertsHtml = `
      <div class="panel alert-panel">
        <h2 class="text-danger">⚠️ Alertas de Ação Imediata</h2>
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

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal AT & Segurança Social Advisor — NIF ${nif}</title>
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
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; padding: 32px 24px; }
    .container { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
    .logo-row { display: flex; align-items: center; gap: 12px; }
    .logo-icon { font-size: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; }
    .subtitle { font-size: 13px; color: var(--muted); }
    .badge-nif { background: #1e293b; color: #34d399; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 13px; margin-left: 8px; border: 1px solid #334155; }
    
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .btn-sync { background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; text-decoration: none; font-size: 13px; }
    .btn-sync:hover { background: #059669; }

    .score-box { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 10px 16px; text-align: right; }
    .score-num { font-size: 22px; font-weight: 800; }
    .score-good { color: var(--green); }
    .score-warning { color: var(--amber); }
    .score-danger { color: var(--red); }

    .grid-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .metric-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .metric-val { font-size: 20px; font-weight: 800; color: #fff; }
    .val-good { color: var(--green); }
    .val-bad { color: var(--red); }
    .metric-sub { font-size: 11.5px; color: #64748b; }

    .panel { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 22px; display: flex; flex-direction: column; gap: 16px; }
    .panel h2 { font-size: 17px; font-weight: 700; color: #fff; }
    .panel-desc { font-size: 13px; color: var(--muted); margin-top: -8px; }

    .alert-panel { border-left: 4px solid var(--red); background: rgba(239, 68, 68, 0.05); }
    .text-danger { color: var(--red); }
    .alerts-grid { display: flex; flex-direction: column; gap: 12px; }
    .alert-card { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .alert-title { font-weight: 700; color: #fca5a5; font-size: 14px; }
    .alert-desc { font-size: 13px; color: #e2e8f0; }
    .alert-action { font-size: 12px; color: #fbbf24; font-weight: 600; margin-top: 4px; }

    .opp-grid { display: flex; flex-direction: column; gap: 14px; }
    .opp-card { background: #0b111e; border: 1px solid var(--border); border-radius: 8px; padding: 18px; display: flex; flex-direction: column; gap: 8px; }
    .opp-top { display: flex; justify-content: space-between; align-items: center; }
    .opp-cat { font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 0.5px; }
    .opp-impact { font-size: 12px; font-weight: 700; color: #facc15; background: rgba(250, 204, 21, 0.12); padding: 2px 8px; border-radius: 4px; }
    .opp-title { font-size: 15px; font-weight: 700; color: #fff; }
    .opp-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }
    .opp-action { font-size: 12.5px; color: #38ef7d; font-weight: 600; margin-top: 4px; }
    .opp-rule { font-size: 11px; color: #64748b; margin-top: 4px; padding-top: 6px; border-top: 1px solid #1e293b; }

    .categories-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .cat-card { background: #0b111e; border: 1px solid var(--border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .cat-head { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; }
    .prog-bg { width: 100%; height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden; }
    .prog-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px; }
    .cat-sub { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); }

    .ti-box { background: #0b111e; border: 1px solid var(--border); border-radius: 8px; padding: 18px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .ti-col { background: #131b2e; border: 1px solid #223048; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .ti-col.active { border-color: var(--green); background: rgba(16, 185, 129, 0.06); }
    .ti-val { font-size: 18px; font-weight: 800; color: #fff; }
    .ti-note { font-size: 11.5px; color: var(--muted); }

    .cookie-update-form { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    textarea { background: #0b111e; border: 1px solid var(--border); color: #f8fafc; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; resize: vertical; height: 90px; }
    .btn-secondary { background: #1e293b; color: #fff; border: 1px solid #334155; padding: 8px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; align-self: flex-start; }

    footer { text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid var(--border); padding-top: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-row">
        <span class="logo-icon">🛡️</span>
        <div>
          <h1>Personal AT & Segurança Social Advisor <span class="badge-nif">NIF: ${nif}</span></h1>
          <p class="subtitle">Modo Standalone • Extração Direta e Otimização Fiscal Contínua</p>
        </div>
      </div>
      <div class="header-actions">
        <div class="score-box">
          <div class="metric-label">Índice de Saúde</div>
          <div class="score-num ${scoreClass}">${taxSummary.healthScore}/100</div>
        </div>
        <form method="POST" action="/sync" style="display:inline;">
          <button type="submit" class="btn-sync">🔄 Sincronizar Agora</button>
        </form>
      </div>
    </header>

    <!-- Metrics -->
    <div class="grid-metrics">
      <div class="metric-card">
        <span class="metric-label">Situação Fiscal (AT)</span>
        <div class="metric-val ${taxSummary.fiscalStatus.includes('Regularizada') ? 'val-good' : 'val-bad'}">${taxSummary.fiscalStatus}</div>
        <span class="metric-sub">Portal das Finanças</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Segurança Social (SS)</span>
        <div class="metric-val ${taxSummary.ssStatus === 'Regularizada' ? 'val-good' : 'val-bad'}">${taxSummary.ssStatus}</div>
        <span class="metric-sub">Segurança Social Direta</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Dívida Total</span>
        <div class="metric-val ${taxSummary.totalDebts > 0 ? 'val-bad' : ''}">${formatCurrency(taxSummary.totalDebts)}</div>
        <span class="metric-sub">AT + Segurança Social</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Deduções IRS Acumuladas</span>
        <div class="metric-val val-good">${formatCurrency(taxSummary.totalDeductionsAccumulated)}</div>
        <span class="metric-sub">Falta deduzir: ${formatCurrency(taxSummary.potentialDeductionsRemaining)}</span>
      </div>
    </div>

    ${alertsHtml}

    <!-- Opportunities & Advice -->
    <div class="panel">
      <h2>🚀 Como Aumentar Deduções & Reduzir IRS (Oportunidades Detetadas)</h2>
      <p class="panel-desc">Recomendações automáticas baseadas nas suas faturas, declarações e enquadramento estatutário.</p>
      <div class="opp-grid">
        ${opportunitiesHtml}
      </div>
    </div>

    <!-- e-Fatura Caps -->
    <div class="panel">
      <h2>🧾 Tetos Legais do e-Fatura & Margens Restantes</h2>
      <p class="panel-desc">Acompanhamento dos limites legais de dedução à coleta no IRS (Artigos 78º-B a 78º-F do CIRS).</p>
      <div class="categories-grid">
        ${[
          { name: 'Despesas Gerais Familiares (35%)', current: state?.efatura?.categorias?.despesasGerais || 0, max: 250, cirs: 'Art. 78º-B CIRS' },
          { name: 'Saúde e Seguros (15%)', current: state?.efatura?.categorias?.saude || 0, max: 1000, cirs: 'Art. 78º-C CIRS' },
          { name: 'Educação e Formação (30%)', current: state?.efatura?.categorias?.educacao || 0, max: 800, cirs: 'Art. 78º-D CIRS' },
          { name: 'Exigência de Fatura (Benefício IVA)', current: state?.efatura?.categorias?.ivaBeneficio || 0, max: 250, cirs: 'Art. 78º-F CIRS' }
        ].map(cat => {
          const pct = Math.min(100, Math.round((cat.current / cat.max) * 100));
          const rem = Math.max(0, cat.max - cat.current);
          return `
            <div class="cat-card">
              <div class="cat-head"><span>${cat.name}</span><span>${formatCurrency(cat.current)} / ${formatCurrency(cat.max)}</span></div>
              <div class="prog-bg"><div class="prog-fill" style="width: ${pct}%;"></div></div>
              <div class="cat-sub"><span>${pct}% atingido (Margem: ${formatCurrency(rem)})</span><span>${cat.cirs}</span></div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- TI Simulator -->
    ${(() => {
      const ti = state?.segSocial?.trabalhadorIndependente;
      const baseMonthly = ti?.baseIncidenciaMensal || 0;
      const monthly = ti?.mensalidadePrevista || (baseMonthly * 0.214);
      if (baseMonthly <= 0) return '';
      return `
        <div class="panel">
          <h2>🏛️ Segurança Social — Otimização Trabalhador Independente (±25%)</h2>
          <p class="panel-desc">Ajuste da Base de Incidência Contributiva (Artigo 163º CRCSPSS) para gestão de tesouraria vs. benefícios sociais e dedução IRS.</p>
          <div class="ti-box">
            <div class="ti-col">
              <h4>Opção -25% (Preservar Liquidez)</h4>
              <div class="ti-val">${formatCurrency(monthly * 0.75)} / mês</div>
              <p class="ti-note">Alivia encargos imediatos em períodos de menores recebimentos.</p>
            </div>
            <div class="ti-col active">
              <h4>Opção Normal (Cálculo Padrão)</h4>
              <div class="ti-val">${formatCurrency(monthly)} / mês</div>
              <p class="ti-note">Cálculo padrão sobre o rendimento relevante apurado.</p>
            </div>
            <div class="ti-col">
              <h4>Opção +25% (Máx. Proteção & IRS)</h4>
              <div class="ti-val">${formatCurrency(monthly * 1.25)} / mês</div>
              <p class="ti-note">100% dedutível no IRS Categoria B e reforça baixas/reforma.</p>
            </div>
          </div>
        </div>
      `;
    })()}

    <!-- Update Cookies Form -->
    <div class="panel">
      <h2>🔑 Atualizar Sessão / Cookies dos Portais</h2>
      <p class="panel-desc">Cole cookies atualizados para recalcular o relatório sem qualquer extensão.</p>
      <form class="cookie-update-form" method="POST" action="/update-cookies">
        <textarea name="cookies" placeholder="Cole aqui o conteúdo de cookies.txt ou formato Netscape..."></textarea>
        <button type="submit" class="btn-secondary">💾 Guardar Cookies & Reanalisar</button>
      </form>
    </div>

    <footer>
      Última atualização: ${new Date(updatedAt).toLocaleString('pt-PT')} • Processamento 100% local no seu computador
    </footer>
  </div>
</body>
</html>
  `;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/dashboard')) {
    const reportData = await getOrRunReport();
    const html = renderHtml(reportData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && req.url === '/sync') {
    await crawler.crawlAndAnalyze();
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/update-cookies') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const parsed = new URLSearchParams(body);
      const rawCookies = parsed.get('cookies');
      if (rawCookies && rawCookies.trim()) {
        fs.writeFileSync(COOKIE_PATH, rawCookies.trim());
        crawler.loadCookies();
        await crawler.crawlAndAnalyze();
      }
      res.writeHead(302, { 'Location': '/' });
      res.end();
    });
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
