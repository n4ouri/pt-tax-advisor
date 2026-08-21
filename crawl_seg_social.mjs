import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = path.resolve(process.cwd(), 'crawled_data/seg_social');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const COOKIES_FILE = path.resolve(process.cwd(), 'ss_cookies.txt');

function fetchEndpoint(url, isJson = false) {
  try {
    const cmd = `curl -s -L -b "${COOKIES_FILE}" -c "${COOKIES_FILE}" -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -w "\n__HTTP_STATUS__:%{http_code}\n__EFFECTIVE_URL__:%{url_effective}" "${url}"`;
    const rawOutput = execSync(cmd, { encoding: 'utf-8', maxBuffer: 25 * 1024 * 1024 });
    
    const parts = rawOutput.split('\n__HTTP_STATUS__:');
    const body = parts[0];
    const meta = parts[1] ? parts[1].split('\n__EFFECTIVE_URL__:') : ['unknown', 'unknown'];
    const statusCode = meta[0]?.trim();
    const effectiveUrl = meta[1]?.trim();

    return {
      success: statusCode === '200' || statusCode === '201',
      statusCode,
      effectiveUrl,
      body
    };
  } catch (e) {
    return {
      success: false,
      statusCode: 'ERROR',
      effectiveUrl: url,
      body: null,
      error: e.message
    };
  }
}

const ENDPOINTS_TO_CRAWL = [
  // REST API Endpoints
  { id: 'personal_data', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/login/personalData' },
  { id: 'login_address', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/login/address' },
  { id: 'unread_messages_count', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/login/unreadMessagesCount' },
  { id: 'payments_current', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/payments/current' },
  { id: 'payments_previous', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/payments/previous' },
  { id: 'inbox_messages', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/fraw/mensagens/inbox' },
  { id: 'inbox_paginated', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/fraw/mensagens/mensagensPaginadas/inbox' },
  { id: 'archived_messages', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/fraw/mensagens/mensagensPaginadas/arquivadas' },
  { id: 'access_logs', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/pssd/activity/accessLogs' },
  { id: 'service_logs', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/pssd/activity/serviceLogs' },
  { id: 'favorites', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/pssd/favorites' },
  { id: 'favorites_count', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/pssd/favorites/count' },
  { id: 'menu_principal', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/menu/principal' },
  { id: 'fram_config', type: 'REST', url: 'https://www.seg-social.pt/ptss/feapi/fram/config.json' },
  { id: 'practical_guide', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/practical-guide' },
  { id: 'faq', type: 'REST', url: 'https://www.seg-social.pt/ptss/rest/public/pssd/faq' },

  // Portal Web Pages & Functionalities
  { id: 'home', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/pssd/home' },
  { id: 'posicao_atual', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/ci/posicao-atual/posicao-atual' },
  { id: 'situacao_contributiva', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/ascd/pesquisa-entidade' },
  { id: 'planos_prestacionais_execucao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/sef/planos/consulta-planos-prestacionais' },
  { id: 'notificacoes_execucao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/sef/notificacoes/consulta-notificacoes' },
  { id: 'carreira_contributiva', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/cci/carreiraContributiva/consultar_carreira_ss' },
  { id: 'gestao_bancaria_iban', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/ci/gestao-bancaria' },
  { id: 'contactos_utilizador', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/gus/gestao-atualizacao-contactos/consultar-contactos' },
  { id: 'prestacoes_apoios', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/sicc/declaracao-prestacoes-apoios' },
  { id: 'rendimentos_patrimonio', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/grend/rendimento/consulta' },
  { id: 'rendimentos_declaracao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/grend/declaracao/consulta' },
  { id: 'agregado_familiar', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/arf/declaracao' },
  { id: 'situacao_familiar_irs', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/arf/declaracao/situacao-familiar' },
  { id: 'agregado_relacoes', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/arf/declaracao/relacoes' },
  { id: 'eclic_pedidos', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/gac/consultar-pedido' },
  { id: 'recibos_pensao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/hsip/consulta/recibo' },
  { id: 'prestacoes_familiares_declaracao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/pf/declaracao-situacao' },
  { id: 'desemprego_declaracao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/des/consultar/dsd' },
  { id: 'desemprego_pedidos', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/des/consultar/pedido/pesquisar' },
  { id: 'pensionista_declaracao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/sip/interno/declaracaopensionista' },
  { id: 'prestacao_inclusao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/gadi/pspi/declaracao/obter-declaracao' },
  { id: 'doenca_declaracao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/itpt/documentos/doenca/emitir/declaracao' },
  { id: 'parentalidade_declaracao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/itpt/documentos/parentalidade/emitir/declaracao' },
  { id: 'csi_declaracao', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/csi/emitirDeclaracao' },
  { id: 'autorizacao_declaracoes', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/gdod/autorizacao' },
  { id: 'subcontas_utilizadores', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/gus/gestao-utilizadores/consultar-utilizadores-subconta' },
  { id: 'historico_conta', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/gus/historico-conta' },
  { id: 'comprovativo_contactos', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/id/contactos-base/dados-identificacao' },
  { id: 'simulador_prestacoes', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/sps/simulador/inicio' },
  { id: 'acessos_minha_atividade', type: 'PAGE', url: 'https://www.seg-social.pt/ptss/fraw/acessos' }
];

async function runFullCrawler() {
  console.log('===============================================================');
  console.log('🚀 INICIANDO CRAWLER COMPLETO DA SEGURANÇA SOCIAL DIRETA');
  console.log('===============================================================\n');

  const crawlReport = {
    crawledAt: new Date().toISOString(),
    totalEndpoints: ENDPOINTS_TO_CRAWL.length,
    successful: 0,
    failed: 0,
    results: {}
  };

  for (const item of ENDPOINTS_TO_CRAWL) {
    process.stdout.write(`[${item.type}] A aceder a: ${item.id} (${item.url})... `);
    const res = fetchEndpoint(item.url);

    if (res.success) {
      crawlReport.successful++;
      console.log(`✅ OK (${res.statusCode})`);

      const filename = `${item.id}.${item.type === 'REST' && res.body.startsWith('{') || res.body.startsWith('[') ? 'json' : 'html'}`;
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, res.body, 'utf-8');

      let parsedData = null;
      if (filename.endsWith('.json')) {
        try {
          parsedData = JSON.parse(res.body);
        } catch (e) {}
      }

      crawlReport.results[item.id] = {
        type: item.type,
        url: item.url,
        effectiveUrl: res.effectiveUrl,
        statusCode: res.statusCode,
        file: filename,
        data: parsedData || (res.body ? `${res.body.length} bytes` : null)
      };
    } else {
      crawlReport.failed++;
      console.log(`❌ FALHA (${res.statusCode})`);
      crawlReport.results[item.id] = {
        type: item.type,
        url: item.url,
        statusCode: res.statusCode,
        error: res.error || 'HTTP Error'
      };
    }
  }

  // Write master crawl report
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(crawlReport, null, 2), 'utf-8');

  console.log('\n===============================================================');
  console.log(`🎉 CRAWL CONCLUÍDO!`);
  console.log(`Total: ${crawlReport.totalEndpoints} | Sucessos: ${crawlReport.successful} | Falhas: ${crawlReport.failed}`);
  console.log(`Todos os ficheiros foram guardados em: ${OUTPUT_DIR}`);
  console.log('===============================================================\n');
}

runFullCrawler();
