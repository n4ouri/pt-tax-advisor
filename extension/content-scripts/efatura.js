/**
 * Content script for e-Fatura - faturas.portaldasfinancas.gov.pt
 */

(function () {
  console.log('[PT-Advisor] e-Fatura Content Script initialized on:', window.location.href);

  window.addEventListener('DOMContentLoaded', runExtraction);
  setTimeout(runExtraction, 1500);

  function runExtraction() {
    try {
      const efaturaData = scrapeEfaturaPage();
      if (efaturaData && Object.keys(efaturaData).length > 0) {
        chrome.runtime.sendMessage({
          action: 'SAVE_SNAPSHOT',
          payload: {
            source: 'EFATURA',
            section: 'DEDUCOES_E_FATURAS',
            data: efaturaData
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[PT-Advisor] Runtime message error:', chrome.runtime.lastError.message);
          } else {
            showFloatingBadge('e-Fatura Sincronizado');
          }
        });
      }
    } catch (e) {
      console.error('[PT-Advisor] Error scraping e-Fatura page:', e);
    }
  }

  function scrapeEfaturaPage() {
    const data = {
      extractedAt: new Date().toISOString(),
      url: window.location.href,
      categorias: {},
      faturasPendentes: 0
    };

    const bodyText = document.body.innerText;

    // 1. Detect pending invoices count
    const pendingMatch = bodyText.match(/(\d+)\s*faturas?\s*pendentes?/i) || bodyText.match(/Tem\s*(\d+)\s*faturas?\s*para\s*validar/i);
    if (pendingMatch) {
      data.faturasPendentes = parseInt(pendingMatch[1], 10);
    }

    // 2. Extract Category Deductions
    // Select deduction blocks / cards
    const categoryCards = document.querySelectorAll('.deducao-setor, .sector-card, .col-deducao, [class*="setor"], tr');
    categoryCards.forEach(card => {
      const cardText = card.innerText;
      
      const parseAmount = (text) => {
        const match = text.match(/([\d\.\,]+)\s*€/);
        if (match) {
          return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        return 0;
      };

      if (cardText.toLowerCase().includes('gerais familiares') || cardText.toLowerCase().includes('despesas gerais')) {
        data.categorias.despesasGerais = parseAmount(cardText);
      } else if (cardText.toLowerCase().includes('saúde') || cardText.toLowerCase().includes('saude')) {
        data.categorias.saude = parseAmount(cardText);
      } else if (cardText.toLowerCase().includes('educação') || cardText.toLowerCase().includes('educacao')) {
        data.categorias.educacao = parseAmount(cardText);
      } else if (cardText.toLowerCase().includes('habitação') || cardText.toLowerCase().includes('habitacao') || cardText.toLowerCase().includes('imóveis')) {
        data.categorias.habitacao = parseAmount(cardText);
      } else if (cardText.toLowerCase().includes('lares')) {
        data.categorias.lares = parseAmount(cardText);
      } else if (cardText.toLowerCase().includes('restauração') || cardText.toLowerCase().includes('exigência de fatura') || cardText.toLowerCase().includes('benefício iva')) {
        data.categorias.ivaBeneficio = parseAmount(cardText);
      }
    });

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
