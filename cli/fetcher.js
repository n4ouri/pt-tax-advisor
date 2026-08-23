/**
 * Portal Session Ingestion & Resilient HTTPS Fetcher
 * 
 * Ingests session cookies or exported dumps from:
 * - Portal das Finanças (financas.gov.pt / portaldasfinancas.gov.pt)
 * - Segurança Social Direta (seg-social.pt / app.seg-social.pt)
 * - e-Fatura (faturas.portaldasfinancas.gov.pt)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

export function parseCookieFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Ficheiro de cookies não encontrado: ${filePath}`);
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8');
  return parseCookieString(rawContent);
}

export function parseCookieString(rawContent) {
  const cookies = [];
  if (!rawContent || !rawContent.trim()) return cookies;

  try {
    const parsedJson = JSON.parse(rawContent);
    if (Array.isArray(parsedJson)) {
      return parsedJson.filter(c => c && c.name && c.value);
    } else if (typeof parsedJson === 'object' && parsedJson !== null) {
      return Object.entries(parsedJson).map(([name, value]) => ({ name, value }));
    }
  } catch (e) {
    const lines = rawContent.split('\n');
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const parts = line.split('\t');
      if (parts.length >= 7) {
        cookies.push({
          domain: parts[0],
          name: parts[5],
          value: parts[6]
        });
      } else if (line.includes('=')) {
        const [name, ...val] = line.split('=');
        cookies.push({ name: name.trim(), value: val.join('=').trim() });
      }
    });
  }

  return cookies;
}

export function buildCookieHeader(cookies, domainFilter) {
  if (!Array.isArray(cookies)) return '';
  const matching = cookies.filter(c => {
    if (!domainFilter || !c.domain) return true;
    return c.domain.includes(domainFilter);
  });

  return matching.map(c => `${c.name}=${c.value}`).join('; ');
}

export function isInvalidErrorResponse(body) {
  if (!body || typeof body !== 'string') return true;
  const trimmed = body.trim();
  if (trimmed.length < 5) return true;
  if (trimmed.includes('Aplicação Inexistente') || trimmed.includes('ADC O pedido é inválido')) return true;
  if (trimmed.includes('Serviço de Autenticação da Segurança Social') && !trimmed.includes('class="PTSS')) return true;
  if (trimmed.includes('Sessão expirada') || trimmed.includes('loginRedirect')) return true;
  return false;
}

export async function makeHttpsRequest(urlStr, cookieHeader = '', timeoutMs = 10000, maxRedirects = 5) {
  if (maxRedirects < 0) return { success: false, error: 'Too many redirects' };

  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      };
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers,
        timeout: timeoutMs
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', async () => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, urlStr).toString();
            resolve(await makeHttpsRequest(nextUrl, cookieHeader, timeoutMs, maxRedirects - 1));
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            const invalid = isInvalidErrorResponse(body);
            resolve({
              success: !invalid,
              statusCode: res.statusCode,
              body,
              isSessionStale: invalid
            });
          } else {
            resolve({
              success: false,
              statusCode: res.statusCode,
              body,
              isSessionStale: res.statusCode === 401 || res.statusCode === 403
            });
          }
        });
      });

      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timed out' });
      });
      req.end();
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

/**
 * Fetch data from portals with live querying & snapshot fallback
 */
export async function fetchPortalDataWithCookies(cookieList) {
  const atCookies = buildCookieHeader(cookieList, 'financas.gov.pt');
  const ssCookies = buildCookieHeader(cookieList, 'seg-social.pt');

  console.log(`[PT-Advisor] Processados ${cookieList.length} cookies (AT: ${atCookies.length > 0 ? 'Sim' : 'Não'}, SS: ${ssCookies.length > 0 ? 'Sim' : 'Não'})`);

  // Default state structure
  const state = {
    profile: {},
    contactos: {},
    contaBancaria: {},
    at: {
      situacaoFiscal: 'Regularizada',
      dividas: { total: 0, processos: [] },
      regimeSimplificado: {
        rendimentoServicos: 0,
        despesasAtividade: 0,
        contribuicoesSS: 0
      }
    },
    segSocial: {
      situacaoContributiva: 'Regularizada',
      dataApuramento: null,
      numeroDeclaracao: null,
      dividas: { total: 0 },
      execucaoFiscal: null,
      carreiraContributiva: null,
      trabalhadorIndependente: null
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

  // 1. Ingest cached snapshot as base if available
  const snapshotPath = path.resolve(process.cwd(), 'crawled_data/seg_social/seg_social_unified_snapshot.json');
  if (fs.existsSync(snapshotPath)) {
    try {
      const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
      if (snap.profile) state.profile = snap.profile;
      if (snap.contactos) state.contactos = snap.contactos;
      if (snap.contaBancaria) state.contaBancaria = snap.contaBancaria;
      if (snap.situacaoContributiva?.estado) state.segSocial.situacaoContributiva = snap.situacaoContributiva.estado;
      if (snap.situacaoContributiva?.dataApuramento) state.segSocial.dataApuramento = snap.situacaoContributiva.dataApuramento;
      if (snap.situacaoContributiva?.numeroDeclaracao) state.segSocial.numeroDeclaracao = snap.situacaoContributiva.numeroDeclaracao;
      if (snap.posicaoAtual?.dividaEmExecucaoFiscal !== undefined) state.segSocial.dividas.total = snap.posicaoAtual.dividaEmExecucaoFiscal;
      if (snap.execucaoFiscal) state.segSocial.execucaoFiscal = snap.execucaoFiscal;
      if (snap.carreiraContributiva) state.segSocial.carreiraContributiva = snap.carreiraContributiva;
      if (snap.trabalhadorIndependente) {
        state.segSocial.trabalhadorIndependente = snap.trabalhadorIndependente;
        const relTrim = snap.trabalhadorIndependente.rendimentoRelevanteTrimestral;
        const mensPrev = snap.trabalhadorIndependente.mensalidadePrevista;
        if (relTrim) state.at.regimeSimplificado.rendimentoServicos = (relTrim / 0.70) * 4;
        if (mensPrev) state.at.regimeSimplificado.contribuicoesSS = mensPrev * 12;
      }
    } catch (e) {
      console.warn('[PT-Advisor] Nota sobre leitura do snapshot local:', e.message);
    }
  }

  // 2. Attempt live queries if cookies are supplied
  if (ssCookies) {
    try {
      const pRes = await makeHttpsRequest('https://www.seg-social.pt/ptss/rest/public/pssd/login/personalData', ssCookies);
      if (pRes.success && pRes.body) {
        const liveProfile = JSON.parse(pRes.body);
        if (liveProfile.niss) {
          state.profile = { ...state.profile, ...liveProfile };
          console.log(`  ✓ SS Personal Data sincronizado (NISS: ${liveProfile.niss})`);
        }
      }
    } catch (e) {
      // Graceful fallback
    }
  }

  if (atCookies) {
    try {
      const efRes = await makeHttpsRequest('https://faturas.portaldasfinancas.gov.pt/homeBeneficio.action', atCookies);
      if (efRes.success && efRes.body) {
        const pMatch = efRes.body.match(/(\d+)\s*faturas?\s*pendentes?/i);
        if (pMatch) {
          state.efatura.faturasPendentes = parseInt(pMatch[1], 10);
          console.log(`  ✓ e-Fatura sincronizado (${state.efatura.faturasPendentes} faturas pendentes)`);
        }
      }
    } catch (e) {
      // Graceful fallback
    }
  }

  return state;
}

