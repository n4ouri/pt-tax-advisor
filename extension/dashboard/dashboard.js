/**
 * Full Advisor Dashboard Script
 */

import { generateAdvisorReport, DEDUCTION_CAPS, DEADLINES_CALENDAR } from '../background/advisor-engine.js';

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupSimulator();
  setupCompanySimulator();
  setupBackupActions();
  await loadAndRenderDashboard();

  document.getElementById('refresh-btn').addEventListener('click', async () => {
    await loadAndRenderDashboard();
  });

  document.getElementById('view-all-opts-btn')?.addEventListener('click', () => {
    switchTab('optimizations');
  });
});

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  const contentSec = document.getElementById(`tab-${tabId}`);
  if (navBtn && contentSec) {
    navBtn.classList.add('active');
    contentSec.classList.add('active');
  }
}

async function loadAndRenderDashboard() {
  chrome.runtime.sendMessage({ action: 'GET_ADVISOR_DATA' }, (response) => {
    if (!response || !response.success || !response.data) return;

    const data = response.data;
    const report = data.advisorReport || generateAdvisorReport(data.aggregatedState || {});
    const aggregated = data.aggregatedState || {};
    const history = data.historyLog || [];

    renderOverview(report, aggregated);
    renderOptimizations(report);
    renderEFatura(aggregated);
    renderDebts(aggregated);
    renderDeadlines(report.upcomingDeadlines);
    renderHistory(history);
  });
}

function renderOverview(report, aggregated) {
  const { taxSummary, alerts, opportunities, upcomingDeadlines } = report;

  // Health Score
  const scoreEl = document.getElementById('health-score-num');
  scoreEl.innerText = taxSummary.healthScore;
  scoreEl.style.color = taxSummary.healthScore >= 80 ? '#34d399' : taxSummary.healthScore >= 50 ? '#facc15' : '#f87171';

  // AT Status
  const atStatus = aggregated?.at?.situacaoFiscal || 'Regularizada';
  document.getElementById('at-status-title').innerText = atStatus;
  const badgeAt = document.getElementById('badge-at-status');
  badgeAt.innerText = atStatus;
  badgeAt.className = 'badge ' + (atStatus.includes('Regularizada') ? 'badge-success' : 'badge-danger');
  document.getElementById('at-last-sync').innerText = aggregated?.at?.lastUpdated ? `Última leitura: ${new Date(aggregated.at.lastUpdated).toLocaleDateString('pt-PT')}` : 'Sem dados sincronizados';

  // SS Status
  const ssStatus = aggregated?.segSocial?.situacaoContributiva || 'Regularizada';
  document.getElementById('ss-status-title').innerText = ssStatus;
  const badgeSs = document.getElementById('badge-ss-status');
  badgeSs.innerText = ssStatus;
  badgeSs.className = 'badge ' + (ssStatus === 'Regularizada' ? 'badge-success' : 'badge-danger');
  document.getElementById('ss-last-sync').innerText = aggregated?.segSocial?.lastUpdated ? `Última leitura: ${new Date(aggregated.segSocial.lastUpdated).toLocaleDateString('pt-PT')}` : 'Sem dados sincronizados';

  // Debts & Deductions
  document.getElementById('total-debt-amount').innerText = formatCurrency(taxSummary.totalDebts);
  document.getElementById('total-deductions-amount').innerText = formatCurrency(taxSummary.totalDeductionsAccumulated);
  document.getElementById('potential-remaining-text').innerText = `Margem restante por deduzir: ${formatCurrency(taxSummary.potentialDeductionsRemaining)}`;

  // Critical Alerts
  const alertContainer = document.getElementById('critical-alerts-container');
  const alertList = document.getElementById('critical-alerts-list');
  alertList.innerHTML = '';
  if (alerts.length > 0) {
    alertContainer.classList.remove('hidden');
    alerts.forEach(a => {
      const el = document.createElement('div');
      el.className = 'alert-item';
      el.innerHTML = `
        <div class="alert-item-title">${a.title}</div>
        <div class="alert-item-desc">${a.description}</div>
        <div class="alert-item-action">👉 Ação recomendada: ${a.action}</div>
      `;
      alertList.appendChild(el);
    });
  } else {
    alertContainer.classList.add('hidden');
  }

  // Top Opportunities
  const topList = document.getElementById('top-opportunities-list');
  topList.innerHTML = '';
  opportunities.slice(0, 3).forEach(opp => {
    topList.appendChild(createOpportunityCard(opp));
  });

  // Overview Deadlines
  const deadList = document.getElementById('overview-deadlines-list');
  deadList.innerHTML = '';
  (upcomingDeadlines || []).slice(0, 4).forEach(d => {
    const card = document.createElement('div');
    card.className = 'deadline-card';
    card.innerHTML = `
      <div class="deadline-date-box">${d.day ? `${d.day}/${d.month}` : `Mês ${d.month}`}</div>
      <div class="deadline-info">
        <h4>${d.title}</h4>
        <p>Origem: ${d.source === 'AT' ? 'Autoridade Tributária' : 'Segurança Social'}</p>
      </div>
    `;
    deadList.appendChild(card);
  });
}

function renderOptimizations(report) {
  const fullList = document.getElementById('full-opportunities-list');
  fullList.innerHTML = '';

  if (report.opportunities.length === 0) {
    fullList.innerHTML = `<div class="opportunity-card"><p>Não foram detetadas oportunidades pendentes no momento. A sua situação está optimizada.</p></div>`;
    return;
  }

  report.opportunities.forEach(opp => {
    fullList.appendChild(createOpportunityCard(opp));
  });
}

function createOpportunityCard(opp) {
  const card = document.createElement('div');
  card.className = 'opportunity-card';
  card.innerHTML = `
    <div class="opp-header">
      <span class="opp-category">${opp.category}</span>
      <span class="opp-impact">${opp.impact}</span>
    </div>
    <h3 class="opp-title">${opp.title}</h3>
    <p class="opp-desc">${opp.description}</p>
    ${opp.action ? `<div class="alert-item-action" style="margin-top: 4px;">👉 ${opp.action}</div>` : ''}
    <div class="opp-footer">
      <span>Enquadramento Legal: ${opp.rule || 'CIRS / CRCSPSS'}</span>
    </div>
  `;
  return card;
}

function renderEFatura(aggregated) {
  const container = document.getElementById('efatura-categories-progress');
  container.innerHTML = '';

  const ef = aggregated?.efatura || {};
  const cat = ef.categorias || {};

  const unvalChip = document.getElementById('unvalidated-alert-chip');
  if (ef.faturasPendentes > 0) {
    unvalChip.innerText = `⚠️ ${ef.faturasPendentes} Faturas Pendentes de Validação`;
    unvalChip.classList.remove('hidden');
  } else {
    unvalChip.classList.add('hidden');
  }

  const items = [
    { label: DEDUCTION_CAPS.despesasGerais.label, current: cat.despesasGerais || 0, max: DEDUCTION_CAPS.despesasGerais.maxSingle, rule: DEDUCTION_CAPS.despesasGerais.cirs },
    { label: DEDUCTION_CAPS.saude.label, current: cat.saude || 0, max: DEDUCTION_CAPS.saude.max, rule: DEDUCTION_CAPS.saude.cirs },
    { label: DEDUCTION_CAPS.educacao.label, current: cat.educacao || 0, max: DEDUCTION_CAPS.educacao.max, rule: DEDUCTION_CAPS.educacao.cirs },
    { label: DEDUCTION_CAPS.habitacao.label, current: cat.habitacao || 0, max: DEDUCTION_CAPS.habitacao.maxRent, rule: DEDUCTION_CAPS.habitacao.cirs },
    { label: DEDUCTION_CAPS.lares.label, current: cat.lares || 0, max: DEDUCTION_CAPS.lares.max, rule: DEDUCTION_CAPS.lares.cirs },
    { label: DEDUCTION_CAPS.ivaBeneficio.label, current: cat.ivaBeneficio || 0, max: DEDUCTION_CAPS.ivaBeneficio.max, rule: DEDUCTION_CAPS.ivaBeneficio.cirs }
  ];

  items.forEach(item => {
    const percent = Math.min(100, Math.round((item.current / item.max) * 100));
    const remaining = Math.max(0, item.max - item.current);

    const card = document.createElement('div');
    card.className = 'category-progress-card';
    card.innerHTML = `
      <div class="cat-header">
        <span>${item.label}</span>
        <span>${formatCurrency(item.current)} / ${formatCurrency(item.max)}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${percent}%;"></div>
      </div>
      <div class="cat-meta">
        <span>${percent}% atingido (falta ${formatCurrency(remaining)})</span>
        <span>${item.rule}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function setupSimulator() {
  const incInput = document.getElementById('sim-income');
  const typeSelect = document.getElementById('sim-type');

  const update = () => {
    const income = parseFloat(incInput.value) || 0;
    const factor = parseFloat(typeSelect.value) || 0.70;
    const monthlyBase = (income * factor) / 3;
    const standardRate = 0.214;
    const baseVal = monthlyBase * standardRate;

    document.getElementById('sim-val-base').innerText = formatCurrency(baseVal);
    document.getElementById('sim-val-minus').innerText = formatCurrency(baseVal * 0.75);
    document.getElementById('sim-val-plus').innerText = formatCurrency(baseVal * 1.25);
  };

  incInput.addEventListener('input', update);
  typeSelect.addEventListener('change', update);
  update();
}

function renderDebts(aggregated) {
  const container = document.getElementById('debts-table-container');
  const atDebts = aggregated?.at?.dividas?.processos || [];
  const ssDebts = aggregated?.segSocial?.dividas?.referenciasPendentes || [];

  if (atDebts.length === 0 && ssDebts.length === 0) {
    container.innerHTML = `<div class="opportunity-card"><p>✅ Excelente! Não foram detetados processos de dívida ativos nem referências de cobrança pendentes na AT ou Segurança Social.</p></div>`;
    return;
  }

  let html = `<div class="timeline-list">`;
  atDebts.forEach(d => {
    html += `
      <div class="timeline-item CRITICAL">
        <div class="timeline-header">
          <span>AT - Processo de Cobrança / Dívida</span>
          <span class="text-danger">${formatCurrency(d.amount)}</span>
        </div>
        <p>${d.description}</p>
      </div>
    `;
  });
  ssDebts.forEach(ref => {
    html += `
      <div class="timeline-item CRITICAL">
        <div class="timeline-header">
          <span>Segurança Social - Referência de Pagamento</span>
        </div>
        <p>${ref}</p>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderDeadlines(deadlines) {
  const container = document.getElementById('full-deadlines-list');
  let html = `<div class="deadlines-grid">`;
  DEADLINES_CALENDAR.forEach(d => {
    html += `
      <div class="deadline-card">
        <div class="deadline-date-box">${d.day ? `${d.day}/${d.month}` : `Mês ${d.month}`}</div>
        <div class="deadline-info">
          <h4>${d.title}</h4>
          <p>Entidade: ${d.source === 'AT' ? 'Finanças / AT' : 'Segurança Social'}</p>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderHistory(history) {
  const container = document.getElementById('history-timeline-list');
  if (!history || history.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8;">Ainda não existem registos de auditoria gravados.</p>`;
    return;
  }

  container.innerHTML = '';
  history.forEach(item => {
    const el = document.createElement('div');
    el.className = `timeline-item ${item.severity || 'INFO'}`;
    el.innerHTML = `
      <div class="timeline-header">
        <span>${item.title || item.type} (${item.source || 'Geral'})</span>
        <span class="timeline-time">${new Date(item.timestamp).toLocaleString('pt-PT')}</span>
      </div>
      <p>${item.message || ''}</p>
    `;
    container.appendChild(el);
  });
}

function setupBackupActions() {
  document.getElementById('export-json-btn').addEventListener('click', () => {
    chrome.storage.local.get(null, (allData) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `pt_tax_advisor_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  });

  document.getElementById('import-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('import-file-input');
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Por favor selecione um ficheiro JSON de backup.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        await chrome.storage.local.set(parsed);
        alert('Backup importado com sucesso!');
        await loadAndRenderDashboard();
      } catch (err) {
        alert('Erro ao processar ficheiro JSON: ' + err.message);
      }
    };
    reader.readAsText(fileInput.files[0]);
  });

  document.getElementById('clear-db-btn').addEventListener('click', () => {
    if (confirm('Tem a certeza que deseja eliminar todos os registos locais?')) {
      chrome.runtime.sendMessage({ action: 'CLEAR_ALL_DATA' }, () => {
        location.reload();
      });
    }
  });
}

function setupCompanySimulator() {
  const btn = document.getElementById('calc-company-sim-btn');
  const input = document.getElementById('company-sim-gross');
  if (!btn || !input) return;

  const runCalc = () => {
    const gross = parseFloat(input.value) || 50000;
    const container = document.getElementById('company-comparison-results');
    if (!container) return;

    // Autónomo cost (IRS on 75% at ~35% effective rate + SS 21.4% on 70%)
    const personalSS = ((gross * 0.70) / 3) * 0.214 * 12;
    const personalIRS = (gross * 0.75) * 0.35;
    const autonomoTotal = personalIRS + personalSS;

    // Company cost (Director salary 1.350€ * 14 mo + TSU 34.75% + 15% IRS + expenses 6k + meal card + IRC 17%)
    const dirSalary = 1350 * 14;
    const mealCard = 9.60 * 22 * 11;
    const compExpenses = Math.max(6000, gross * 0.12);
    const profitIRC = Math.max(0, gross - dirSalary - compExpenses - mealCard);
    const irc = Math.min(50000, profitIRC) * 0.17 + Math.max(0, profitIRC - 50000) * 0.21;
    const companyTotal = irc + (dirSalary * 0.15) + (dirSalary * 0.3475) + 1800; // accounting

    const diff = autonomoTotal - companyTotal;
    const isAdvantage = diff > 1000;

    container.innerHTML = `
      <div class="comparison-card">
        <h4>Tributação como Autónomo (Recibos Verdes)</h4>
        <p class="comp-val">${formatCurrency(autonomoTotal)} <span class="comp-sub">/ ano</span></p>
        <ul>
          <li>IRS Estimado: ${formatCurrency(personalIRS)}</li>
          <li>Segurança Social: ${formatCurrency(personalSS)}</li>
          <li>Risco de Pagamentos por Conta (PPC)</li>
        </ul>
      </div>

      <div class="comparison-card highlight">
        <h4>Tributação em Sociedade Unipessoal (IRC)</h4>
        <p class="comp-val">${formatCurrency(companyTotal)} <span class="comp-sub">/ ano</span></p>
        <ul>
          <li>IRC PME (17% até 50k): ${formatCurrency(irc)}</li>
          <li>Salário de Gerência + TSU: ${formatCurrency(dirSalary * 1.3475)}</li>
          <li>Subsídio Refeição Isento: +${formatCurrency(mealCard)} / ano</li>
          <li>Dedução 100% IVA Viatura Elétrica</li>
        </ul>
      </div>

      <div class="verdict-banner ${isAdvantage ? 'verdict-success' : 'verdict-neutral'}">
        <strong>${isAdvantage ? '🚀 Vantagem Clara em Abrir Empresa!' : '⚖️ Mantenha o Regime de Trabalhador Independente'}</strong>
        <p>${isAdvantage ? `Poupança fiscal líquida estimada de cerca de <strong>${formatCurrency(diff)}</strong> por ano, além de blindagem de património pessoal e dedução de despesas empresariais.` : `Para esta faturação, os custos de contabilidade e encargos de gerência equilibram-se com o Regime Simplificado.`}</p>
      </div>
    `;
  };

  btn.addEventListener('click', runCalc);
  input.addEventListener('input', runCalc);
  runCalc();
}

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

