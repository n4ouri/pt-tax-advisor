/**
 * Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const atStatusEl = document.getElementById('at-status');
  const ssStatusEl = document.getElementById('ss-status');
  const totalDebtsEl = document.getElementById('total-debts');
  const pendingInvoicesEl = document.getElementById('pending-invoices');
  const deductionsSavedEl = document.getElementById('deductions-saved');
  const healthBadgeEl = document.getElementById('health-badge');
  const adviceTitleEl = document.getElementById('advice-title');
  const adviceDescEl = document.getElementById('advice-desc');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');

  openDashboardBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
  });

  // Request latest data from background
  chrome.runtime.sendMessage({ action: 'GET_ADVISOR_DATA' }, (response) => {
    if (!response || !response.success || !response.data) return;

    const { aggregatedState, advisorReport } = response.data;

    if (advisorReport) {
      const { taxSummary, alerts, opportunities, recommendations } = advisorReport;

      // Update Health Badge
      const score = taxSummary.healthScore || 100;
      healthBadgeEl.innerText = `Score: ${score}/100`;
      healthBadgeEl.className = 'health-badge ' + (
        score >= 80 ? 'health-good' : score >= 50 ? 'health-warning' : 'health-critical'
      );

      // Update Fiscal & SS Status
      if (aggregatedState?.at?.situacaoFiscal) {
        atStatusEl.innerText = aggregatedState.at.situacaoFiscal;
        atStatusEl.className = 'card-value ' + (
          aggregatedState.at.situacaoFiscal.includes('Regularizada') ? 'status-ok' : 'status-bad'
        );
      }

      if (aggregatedState?.segSocial?.situacaoContributiva) {
        ssStatusEl.innerText = aggregatedState.segSocial.situacaoContributiva;
        ssStatusEl.className = 'card-value ' + (
          aggregatedState.segSocial.situacaoContributiva === 'Regularizada' ? 'status-ok' : 'status-bad'
        );
      }

      // Update Quick Stats
      totalDebtsEl.innerText = formatCurrency(taxSummary.totalDebts);
      totalDebtsEl.style.color = taxSummary.totalDebts > 0 ? '#f87171' : '#ffffff';
      
      pendingInvoicesEl.innerText = taxSummary.pendingInvoicesCount;
      deductionsSavedEl.innerText = formatCurrency(taxSummary.totalDeductionsAccumulated);

      // Update Top Advice / Alert
      if (alerts.length > 0) {
        adviceTitleEl.innerText = alerts[0].title;
        adviceDescEl.innerText = alerts[0].description;
        document.getElementById('top-advice-box').style.borderLeftColor = '#f87171';
      } else if (opportunities.length > 0) {
        adviceTitleEl.innerText = opportunities[0].title;
        adviceDescEl.innerText = opportunities[0].description;
        document.getElementById('top-advice-box').style.borderLeftColor = '#38ef7d';
      } else if (recommendations.length > 0) {
        adviceTitleEl.innerText = recommendations[0].title;
        adviceDescEl.innerText = recommendations[0].description;
      }
    }
  });
});

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
