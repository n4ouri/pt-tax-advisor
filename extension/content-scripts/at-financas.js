/**
 * Content script for Portal das Finanças (AT) - financas.gov.pt / portaldasfinancas.gov.pt
 */

(function () {
  console.log('[PT-Advisor] AT Content Script initialized on:', window.location.href);

  // Run extraction on load
  window.addEventListener('DOMContentLoaded', runExtraction);
  setTimeout(runExtraction, 1500); // Retry in case of SPA hydration

  function runExtraction() {
    try {
      const atData = scrapeATPage();
      if (atData && Object.keys(atData).length > 0) {
        chrome.runtime.sendMessage({
          action: 'SAVE_SNAPSHOT',
          payload: {
            source: 'AT',
            section: detectSection(window.location.href),
            data: atData
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[PT-Advisor] Runtime message error:', chrome.runtime.lastError.message);
          } else {
            showFloatingBadge('AT Sincronizada');
          }
        });
      }
    } catch (e) {
      console.error('[PT-Advisor] Error scraping AT page:', e);
    }
  }

  function detectSection(url) {
    if (url.includes('/dividas') || url.includes('/cobranca') || url.includes('/execucoes')) return 'DIVIDAS';
    if (url.includes('/declaracoes') || url.includes('/irs') || url.includes('/iva')) return 'DECLARACOES';
    if (url.includes('/planos') || url.includes('/prestacoes')) return 'PLANOS_PAGAMENTO';
    if (url.includes('/certidoes')) return 'CERTIDOES';
    return 'GERAL';
  }

  function scrapeATPage() {
    const data = {
      extractedAt: new Date().toISOString(),
      url: window.location.href
    };

    // 1. Extract NIF and User Name
    const nifElement = document.querySelector('.user-nif, [id*="nif"], .nif-user, .header-user-info, .auth-user-nif');
    const headerText = document.body.innerText;
    const nifMatch = headerText.match(/NIF:\s*(\d{9})/i) || headerText.match(/(\d{9})/);
    if (nifMatch) {
      data.nif = nifMatch[1];
    }

    // 2. Extract Debts / Dívidas Fiscais / Execuções Fiscais
    let totalDebt = 0;
    const debtRows = [];
    
    // Look for debt tables or alert cards
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const text = table.innerText.toLowerCase();
      if (text.includes('processo') || text.includes('quantia') || text.includes('dívida') || text.includes('duc') || text.includes('coima')) {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          if (cells.length >= 2) {
            // Find currency values
            cells.forEach(c => {
              const valMatch = c.match(/([\d\.\,]+)\s*€/);
              if (valMatch) {
                const num = parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.'));
                if (!isNaN(num) && num > 0) {
                  totalDebt += num;
                  debtRows.push({
                    description: cells.join(' | '),
                    amount: num
                  });
                }
              }
            });
          }
        });
      }
    });

    data.dividas = {
      total: totalDebt,
      processos: debtRows
    };

    // Check for "Sem dívidas" or "Situação Regularizada"
    if (headerText.includes('Não tem dívidas fiscais em cobrança') || headerText.includes('Sem processos de execução pendentes') || headerText.includes('Situação tributária regularizada')) {
      data.situacaoFiscal = 'Regularizada';
      data.dividas.total = 0;
    } else if (totalDebt > 0) {
      data.situacaoFiscal = 'Com Dívida / Não Regularizada';
    }

    // 3. Extract Declarations (IRS / IVA / IES)
    const declarations = [];
    const declMatches = document.querySelectorAll('.table-declaracoes tbody tr, .declaracao-item, [class*="declaracao"]');
    declMatches.forEach(el => {
      declarations.push({
        text: el.innerText.replace(/\s+/g, ' ').trim()
      });
    });
    if (declarations.length > 0) {
      data.declaracoes = declarations;
    }

    // 4. Extract Payment Plans / Planos Prestacionais
    const planos = [];
    if (headerText.includes('Plano prestacional') || headerText.includes('Prestações')) {
      const refMatches = headerText.match(/Referência:?\s*(\d{9,15})/gi);
      const amountMatches = headerText.match(/([\d\.\,]+)\s*€/g);
      if (refMatches || amountMatches) {
        planos.push({
          info: 'Plano detetado',
          detalhes: (amountMatches || []).slice(0, 5)
        });
      }
    }
    data.planosPagamento = planos;

    return data;
  }

  function showFloatingBadge(text) {
    if (document.getElementById('pt-advisor-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'pt-advisor-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #0f172a;
      color: #38ef7d;
      padding: 8px 14px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #1e293b;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    badge.innerHTML = `<span style="font-size: 14px;">🛡️</span> ${text}`;
    badge.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
    });
    document.body.appendChild(badge);

    setTimeout(() => {
      if (badge && badge.parentNode) {
        badge.style.opacity = '0.7';
      }
    }, 4000);
  }
})();
