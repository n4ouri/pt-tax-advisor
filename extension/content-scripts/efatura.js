/**
 * Content script for e-Fatura - faturas.portaldasfinancas.gov.pt
 * Enhanced with MutationObserver for Dynamic e-Fatura Views & Precision Deduction Extraction
 */

(function () {
  console.log('[PT-Advisor] e-Fatura Content Script initialized on:', window.location.href);

  let lastExtractionHash = '';
  let debounceTimer = null;

  window.addEventListener('DOMContentLoaded', triggerDebouncedExtraction);
  window.addEventListener('load', triggerDebouncedExtraction);

  const observer = new MutationObserver(() => {
    triggerDebouncedExtraction();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function triggerDebouncedExtraction() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runExtraction, 400);
  }

  function runExtraction() {
    try {
      if (document.title.includes('Aplicação Inexistente') || document.body.innerText.includes('ADC O pedido é inválido')) {
        return;
      }

      const efaturaData = scrapeEfaturaPage();
      if (!efaturaData || Object.keys(efaturaData.categorias).length === 0 && efaturaData.faturasPendentes === 0) {
        return;
      }

      const currentHash = JSON.stringify(efaturaData);
      if (currentHash === lastExtractionHash) return;
      lastExtractionHash = currentHash;

      chrome.runtime.sendMessage({
        action: 'SAVE_SNAPSHOT',
        payload: {
          source: 'EFATURA',
          section: 'DEDUCOES_E_FATURAS',
          data: efaturaData
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension context reloaded
        } else {
          showFloatingBadge('e-Fatura Sincronizado');
        }
      });
    } catch (e) {
      console.error('[PT-Advisor] Error scraping e-Fatura page:', e);
    }
  }

  function scrapeEfaturaPage() {
    const data = {
      extractedAt: new Date().toISOString(),
      url: window.location.href,
      categorias: {
        despesasGerais: 0,
        saude: 0,
        educacao: 0,
        habitacao: 0,
        lares: 0,
        ivaBeneficio: 0
      },
      faturasPendentes: 0
    };

    const bodyText = document.body.innerText;

    // 1. Detect pending invoices count
    const pendingMatch = bodyText.match(/(\d+)\s*faturas?\s*pendentes?/i) || 
                         bodyText.match(/Tem\s*(\d+)\s*faturas?\s*para\s*validar/i) ||
                         bodyText.match(/(\d+)\s*faturas?\s*a\s*necessitar\s*de\s*complemento/i);
    if (pendingMatch) {
      data.faturasPendentes = parseInt(pendingMatch[1], 10);
    }

    const parseAmount = (text) => {
      const match = text.match(/([\d\.\,]+)\s*€/);
      if (match) {
        const num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    // 2. Extract Category Deductions
    const categoryCards = document.querySelectorAll('.deducao-setor, .sector-card, .col-deducao, [class*="setor"], .panel-deducoes, tr, .card');
    categoryCards.forEach(card => {
      const cardText = card.innerText.toLowerCase();

      if (cardText.includes('gerais familiares') || cardText.includes('despesas gerais')) {
        const val = parseAmount(card.innerText);
        if (val > 0) data.categorias.despesasGerais = Math.max(data.categorias.despesasGerais, val);
      } else if (cardText.includes('saúde') || cardText.includes('saude')) {
        const val = parseAmount(card.innerText);
        if (val > 0) data.categorias.saude = Math.max(data.categorias.saude, val);
      } else if (cardText.includes('educação') || cardText.includes('educacao')) {
        const val = parseAmount(card.innerText);
        if (val > 0) data.categorias.educacao = Math.max(data.categorias.educacao, val);
      } else if (cardText.includes('habitação') || cardText.includes('habitacao') || cardText.includes('imóveis')) {
        const val = parseAmount(card.innerText);
        if (val > 0) data.categorias.habitacao = Math.max(data.categorias.habitacao, val);
      } else if (cardText.includes('lares')) {
        const val = parseAmount(card.innerText);
        if (val > 0) data.categorias.lares = Math.max(data.categorias.lares, val);
      } else if (cardText.includes('restauração') || cardText.includes('exigência de fatura') || cardText.includes('benefício iva') || cardText.includes('beneficio iva')) {
        const val = parseAmount(card.innerText);
        if (val > 0) data.categorias.ivaBeneficio = Math.max(data.categorias.ivaBeneficio, val);
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
      transition: transform 0.2s ease, opacity 0.3s ease;
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

