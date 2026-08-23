/**
 * Content script for Segurança Social Direta - seg-social.pt / app.seg-social.pt
 * Enhanced with MutationObserver for SSD SPAs & Resilient Record Extraction
 */

(function () {
  console.log('[PT-Advisor] Seg Social Content Script initialized on:', window.location.href);

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
      // Check for CAS login page
      if (document.body.innerText.includes('Serviço de Autenticação da Segurança Social') && !document.querySelector('.PTSS')) {
        return;
      }

      const ssData = scrapeSegSocialPage();
      if (!ssData || (!ssData.niss && !ssData.situacaoContributiva && !ssData.trabalhadorIndependente)) {
        return;
      }

      const currentHash = JSON.stringify(ssData);
      if (currentHash === lastExtractionHash) return;
      lastExtractionHash = currentHash;

      chrome.runtime.sendMessage({
        action: 'SAVE_SNAPSHOT',
        payload: {
          source: 'SS',
          section: detectSection(window.location.href),
          data: ssData
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension context reloaded
        } else {
          showFloatingBadge('Seg Social Sincronizada');
        }
      });
    } catch (e) {
      console.error('[PT-Advisor] Error scraping Seg Social page:', e);
    }
  }

  function detectSection(url) {
    if (url.includes('/conta-corrente') || url.includes('/posicao-atual') || url.includes('/posicao_atual')) return 'CONTA_CORRENTE';
    if (url.includes('/situacao-contributiva') || url.includes('/ascd')) return 'SITUACAO_CONTRIBUTIVA';
    if (url.includes('/trabalhadores-independentes') || url.includes('/declaracao-trimestral')) return 'TRABALHADOR_INDEPENDENTE';
    if (url.includes('/carreiraContributiva') || url.includes('/cci')) return 'CARREIRA_CONTRIBUTIVA';
    if (url.includes('/acordos') || url.includes('/execucoes')) return 'ACORDOS';
    return 'GERAL';
  }

  function scrapeSegSocialPage() {
    const data = {
      extractedAt: new Date().toISOString(),
      url: window.location.href
    };

    const bodyText = document.body.innerText;

    // 1. Extract NISS
    const nissMatch = bodyText.match(/NISS:?\s*(\d{11})/i) || bodyText.match(/\b(1\d{10})\b/);
    if (nissMatch) {
      data.niss = nissMatch[1];
    }

    // 2. Extract Situação Contributiva
    if (bodyText.includes('Situação Contributiva Regularizada') || bodyText.includes('Sem dívidas à Segurança Social') || bodyText.includes('Situação regularizada')) {
      data.situacaoContributiva = 'Regularizada';
    } else if (bodyText.includes('Não Regularizada') || bodyText.includes('Situação Irregular')) {
      data.situacaoContributiva = 'Não Regularizada';
    } else {
      data.situacaoContributiva = 'Regularizada';
    }

    // 3. Extract Debts and Payments
    let totalDebt = 0;
    const pendingReferences = [];

    // Search for payment references and values
    const refMatches = bodyText.match(/Entidade:?\s*(\d{5})\s*Referência:?\s*(\d{9})\s*Montante:?\s*([\d\.\,]+)\s*€/gi);
    if (refMatches) {
      refMatches.forEach(m => {
        pendingReferences.push(m.replace(/\s+/g, ' '));
      });
    }

    // Look for debt values
    const debtValueMatches = bodyText.match(/Valor em dívida:?\s*([\d\.\,]+)\s*€/gi) || bodyText.match(/Total em atraso:?\s*([\d\.\,]+)\s*€/gi);
    if (debtValueMatches) {
      debtValueMatches.forEach(m => {
        const numMatch = m.match(/([\d\.\,]+)\s*€/);
        if (numMatch) {
          const num = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
          if (!isNaN(num)) totalDebt = Math.max(totalDebt, num);
        }
      });
    }

    // Check for explicit 0,00 debt confirmation
    if (bodyText.includes('0,00 €') && (bodyText.includes('Posição Atual') || bodyText.includes('existem valores para apresentar'))) {
      totalDebt = 0;
    }

    data.dividas = {
      total: totalDebt,
      referenciasPendentes: pendingReferences
    };

    // 4. Extract Independent Worker Details (Declarações Trimestrais / Rendimentos)
    const isTI = bodyText.includes('Trabalhador Independente') || bodyText.includes('Declaração Trimestral') || bodyText.includes('Rendimento relevante');
    if (isTI) {
      const isento = bodyText.includes('Isenção') || bodyText.includes('Isento do pagamento');
      let rendimento = 0;
      
      const rendimentoMatch = bodyText.match(/Rendimento relevante:?\s*([\d\.\,]+)\s*€?/i) || 
                              bodyText.match(/Rendimentos declarados:?\s*([\d\.\,]+)\s*€/i) || 
                              bodyText.match(/Total de rendimentos:?\s*([\d\.\,]+)\s*€/i);
      if (rendimentoMatch) {
        const num = parseFloat(rendimentoMatch[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(num)) rendimento = num;
      }

      data.trabalhadorIndependente = {
        ativo: true,
        isento,
        rendimentoRelevanteTrimestral: rendimento > 0 ? rendimento : null,
        ultimoRendimentoTrimestral: rendimento > 0 ? rendimento : null
      };
    }

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

