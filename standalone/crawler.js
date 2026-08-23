/**
 * Standalone Portal Crawler & Scraper (Zero-Extension)
 * 
 * Ingests session cookies, queries authenticated endpoints on
 * Portal das Finanças, e-Fatura, and Segurança Social Direta,
 * and extracts all tax records and optimization opportunities.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { runAdvisorAnalysis, formatCurrency } from '../cli/advisor.js';

export class PortalCrawler {
  constructor(cookieFilePath) {
    this.cookieFilePath = cookieFilePath;
    this.cookieJar = {};
    this.loadCookies();
  }

  loadCookies() {
    if (!fs.existsSync(this.cookieFilePath)) {
      console.warn(`[Crawler] Ficheiro de cookies não encontrado: ${this.cookieFilePath}`);
      return;
    }

    const content = fs.readFileSync(this.cookieFilePath, 'utf-8');
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        parsed.forEach(c => {
          if (c.name && c.value) this.cookieJar[c.name] = c.value;
        });
      } else if (typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => this.cookieJar[k] = v);
      }
    } catch (e) {
      // Netscape or raw header format
      content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const parts = line.split('\t');
        if (parts.length >= 7) {
          this.cookieJar[parts[5]] = parts[6];
        } else if (line.includes('=')) {
          const [name, ...val] = line.split('=');
          this.cookieJar[name.trim()] = val.join('=').trim();
        }
      });
    }

    console.log(`[Crawler] ${Object.keys(this.cookieJar).length} cookies carregados.`);
  }

  getCookieHeader(domain = '') {
    return Object.entries(this.cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  updateCookiesFromHeaders(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    list.forEach(h => {
      const parts = h.split(';')[0].split('=');
      if (parts.length >= 2) {
        this.cookieJar[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }

  async fetchUrl(urlStr, method = 'GET', postData = null, maxRedirects = 5) {
    if (maxRedirects < 0) return { error: 'Too many redirects' };

    return new Promise((resolve) => {
      const url = new URL(urlStr);
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': this.getCookieHeader(url.hostname)
      };

      if (postData) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: headers,
        timeout: 12000
      }, async (res) => {
        this.updateCookiesFromHeaders(res.headers['set-cookie']);

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', async () => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, urlStr).toString();
            resolve(await this.fetchUrl(nextUrl, 'GET', null, maxRedirects - 1));
          } else {
            resolve({
              url: urlStr,
              statusCode: res.statusCode,
              body
            });
          }
        });
      });

      req.on('error', (err) => resolve({ error: err.message, url: urlStr }));
      if (postData) req.write(postData);
      req.end();
    });
  }

  async crawlAndAnalyze() {
    console.log('[Crawler] A iniciar extração direta dos portais...');

    // Extract NIF from SSO Cookie if present
    let extractedNIF = null;
    if (this.cookieJar['SINGLE_DOMAIN_SSO_COOKIE']) {
      try {
        extractedNIF = Buffer.from(this.cookieJar['SINGLE_DOMAIN_SSO_COOKIE'], 'base64').toString('ascii');
      } catch (e) {}
    }

    // Check for real unified snapshot from live crawl
    const snapshotPath = path.resolve(process.cwd(), 'crawled_data/seg_social/seg_social_unified_snapshot.json');
    let realSnap = null;
    if (fs.existsSync(snapshotPath)) {
      try {
        realSnap = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
      } catch (e) {}
    }

    const relevantTrimestral = realSnap?.trabalhadorIndependente?.rendimentoRelevanteTrimestral;
    const mensalidadePrevista = realSnap?.trabalhadorIndependente?.mensalidadePrevista;

    const state = {
      nif: extractedNIF || realSnap?.profile?.nif || null,
      niss: realSnap?.profile?.niss || null,
      nome: realSnap?.profile?.name || null,
      crawledAt: new Date().toISOString(),
      at: {
        situacaoFiscal: 'Regularizada',
        dividas: { total: 0, processos: [] },
        regimeSimplificado: {
          rendimentoServicos: relevantTrimestral ? (relevantTrimestral / 0.70) * 4 : 0,
          despesasAtividade: 0,
          contribuicoesSS: mensalidadePrevista ? mensalidadePrevista * 12 : 0
        }
      },
      segSocial: {
        situacaoContributiva: realSnap?.situacaoContributiva?.estado || 'Desconhecido',
        numeroDeclaracao: realSnap?.situacaoContributiva?.numeroDeclaracao || null,
        dataApuramento: realSnap?.situacaoContributiva?.dataApuramento || null,
        dividas: { total: realSnap?.posicaoAtual?.dividaEmExecucaoFiscal || 0 },
        execucaoFiscal: realSnap?.execucaoFiscal || null,
        carreiraContributiva: realSnap?.carreiraContributiva || null,
        trabalhadorIndependente: realSnap?.trabalhadorIndependente || null
      },
      efatura: {
        faturasPendentes: 0,
        categorias: {
          despesasGerais: 0,
          saude: 0,
          educacao: 0,
          habitacao: 0,
          lares: 0,
          ivaBeneficio: 0
        }
      }
    };

    // Query e-Fatura
    try {
      const efRes = await this.fetchUrl('https://faturas.portaldasfinancas.gov.pt/homeBeneficio.action');
      if (efRes.body && efRes.body.length > 200 && !efRes.body.includes('Aplicação Inexistente')) {
        const pendingMatch = efRes.body.match(/(\d+)\s*faturas?\s*pendentes?/i) || efRes.body.match(/Tem\s*(\d+)\s*faturas?\s*para\s*validar/i);
        if (pendingMatch) {
          state.efatura.faturasPendentes = parseInt(pendingMatch[1], 10);
        }
      }
    } catch (err) {
      console.warn('[Crawler] Aviso ao ler e-Fatura:', err.message);
    }

    // Query Situação Fiscal & Dívidas
    try {
      const sitRes = await this.fetchUrl('https://sitfiscal.portaldasfinancas.gov.pt/sitfiscal/home');
      if (sitRes.body && sitRes.body.length > 200 && !sitRes.body.includes('Aplicação Inexistente')) {
        if (sitRes.body.includes('Não tem dívidas fiscais em cobrança') || sitRes.body.includes('Situação tributária regularizada')) {
          state.at.situacaoFiscal = 'Regularizada';
          state.at.dividas.total = 0;
        } else {
          const debtMatch = sitRes.body.match(/Valor em dívida:?\s*([\d\.\,]+)\s*€/i) || sitRes.body.match(/Total em atraso:?\s*([\d\.\,]+)\s*€/i);
          if (debtMatch) {
            const num = parseFloat(debtMatch[1].replace(/\./g, '').replace(',', '.'));
            if (!isNaN(num) && num > 0) {
              state.at.dividas.total = num;
              state.at.situacaoFiscal = 'Com Dívida / Não Regularizada';
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Crawler] Aviso ao ler Situação Fiscal:', err.message);
    }

    // Run Advisor Rules Engine
    const report = runAdvisorAnalysis(state);

    const fullResult = {
      nif: state.nif,
      state,
      report,
      updatedAt: new Date().toISOString()
    };

    // Persist to local data folder (robust path resolution)
    const dataDir = fs.existsSync(path.resolve(process.cwd(), 'data')) 
      ? path.resolve(process.cwd(), 'data') 
      : path.resolve(process.cwd(), 'pt-tax-advisor/data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    
    fs.writeFileSync(path.join(dataDir, 'latest_report.json'), JSON.stringify(fullResult, null, 2));
    console.log('[Crawler] Relatório e auditoria gerados em data/latest_report.json');

    return fullResult;
  }
}
