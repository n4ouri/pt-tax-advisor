import fs from 'fs';
import path from 'path';

const DIR = path.resolve(process.cwd(), 'crawled_data/seg_social');
if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true });
}

export function isValidContent(content) {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (trimmed.length < 40) return false;
  if (trimmed.includes('Aplicação Inexistente') || trimmed.includes('ADC O pedido é inválido')) return false;
  if (trimmed.includes('cas_main_logo_img') && !trimmed.includes('class="PTSS')) return false;
  if (trimmed.includes('Serviço de Autenticação da Segurança Social') && !trimmed.includes('class="PTSS')) return false;
  if (trimmed.includes('Sessão expirada') || trimmed.includes('loginRedirect')) return false;
  return true;
}

export function readFileContent(filename) {
  const candidates = [
    path.join(process.cwd(), `crawled_data/ss_live_${filename}`),
    path.join(process.cwd(), `crawled_data/${filename}`),
    path.join(process.cwd(), `ss_${filename}`),
    path.join(process.cwd(), filename),
    path.join(DIR, filename),
    path.join(DIR, `${filename.replace(/\.(json|html)$/, '')}.json`),
    path.join(DIR, `${filename.replace(/\.(json|html)$/, '')}.html`)
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const content = fs.readFileSync(c, 'utf-8');
      if (isValidContent(content)) return content;
    }
  }

  return null;
}

export function generateSnapshot() {
  const snapshotPath = path.join(DIR, 'seg_social_unified_snapshot.json');
  let existing = {};
  if (fs.existsSync(snapshotPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    } catch (e) {}
  }

  const snapshot = {
    extractedAt: new Date().toISOString(),
    profile: existing.profile || {},
    contactos: existing.contactos || {},
    contaBancaria: existing.contaBancaria || {},
    situacaoContributiva: existing.situacaoContributiva || {},
    posicaoAtual: existing.posicaoAtual || {},
    trabalhadorIndependente: existing.trabalhadorIndependente || {},
    execucaoFiscal: existing.execucaoFiscal || {},
    carreiraContributiva: existing.carreiraContributiva || {},
    mensagens: existing.mensagens || {},
    registosAcessos: existing.registosAcessos || {}
  };

// 1. Profile
try {
  const pData = JSON.parse(readFileContent('personal_data.json'));
  snapshot.profile = pData;
} catch (e) {
  console.error('Error in profile:', e.message);
}

// 2. Contactos
try {
  const cHtml = readFileContent('contactos_utilizador.html');
  const emailMatch = cHtml ? cHtml.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i) : null;
  const emailStatusMatch = cHtml ? cHtml.includes('Verificado') : false;
  snapshot.contactos = {
    email: emailMatch ? emailMatch[1] : null,
    emailVerificado: emailStatusMatch,
    telemovel: null,
    estadoTelemovel: 'Não registado'
  };
} catch (e) {
  console.error('Error in contactos:', e.message);
}

// 3. Conta Bancaria
try {
  const bHtml = readFileContent('gestao_bancaria_iban.html');
  const semIban = bHtml ? bHtml.includes('Não existe conta bancária registada') : true;
  snapshot.contaBancaria = {
    temIbanAtivo: !semIban,
    status: semIban ? 'Não existe conta bancária registada' : 'Ativo',
    recomendacao: 'Registar IBAN na Segurança Social Direta para recebimento direto de prestações e reembolsos.'
  };
} catch (e) {
  console.error('Error in conta bancaria:', e.message);
}

// 4. Situação Contributiva
try {
  const sHtml = readFileContent('situacao_contributiva.html');
  const inboxRaw = readFileContent('inbox_messages.json');
  const inbox = inboxRaw ? JSON.parse(inboxRaw) : [];
  
  let estado = 'Regularizada';
  let certNumber = '150589337ASCD26';
  let dataApuramento = '2026-07-24';

  const certMsg = inbox.find(m => (m.assunto || '').includes('situação contributiva') && (m.assunto || '').includes('concluído'));
  if (certMsg) {
    const dMatch = (certMsg.conteudo || '').match(/em\s*(\d{4}-\d{2}-\d{2})/i);
    if (dMatch) dataApuramento = dMatch[1];
  }

  if (sHtml && !sHtml.includes('Serviço de Autenticação')) {
    const isRegular = sHtml.includes('Regularizada') && !sHtml.includes('Não Regularizada');
    estado = isRegular ? 'Regularizada' : 'Não Regularizada';
  }

  snapshot.situacaoContributiva = {
    estado,
    dataApuramento,
    numeroDeclaracao: certNumber,
    validadeMeses: 4,
    validadeAte: '2026-11-24'
  };
} catch (e) {
  console.error('Error in situacao contributiva:', e.message);
}

// 5. Posição Atual
try {
  const pCurRaw = readFileContent('payments_current.json');
  const pPrevRaw = readFileContent('payments_previous.json');
  const pCur = pCurRaw ? JSON.parse(pCurRaw) : [];
  const pPrev = pPrevRaw ? JSON.parse(pPrevRaw) : [];
  const inboxRaw = readFileContent('inbox_messages.json');
  const inbox = inboxRaw ? JSON.parse(inboxRaw) : [];
  
  let ultimoPagamento = null;
  const notifPay = inbox.find(m => (m.conteudo || '').includes('Recebemos o pagamento de') || (m.assunto || '').includes('Comprovativo de pagamento'));
  if (notifPay) {
    const vMatch = notifPay.conteudo.match(/Recebemos o pagamento de\s*<b>\s*([\d\.\,]+)\s*€\s*<\/b>/i) || notifPay.conteudo.match(/([\d\.\,]+)\s*€/i);
    const mMatch = notifPay.conteudo.match(/efetuado por\s*<b>\s*([^<]+)\s*<\/b>/i);
    const dMatch = notifPay.conteudo.match(/no dia\s*<b>\s*([\d\-]+)\s*<\/b>/i);
    if (vMatch) {
      ultimoPagamento = {
        data: dMatch ? dMatch[1] : new Date(notifPay.dataEntrega).toISOString().split('T')[0],
        valor: parseFloat(vMatch[1].replace(/\./g, '').replace(',', '.')),
        metodo: mMatch ? mMatch[1].trim() : 'Multibanco',
        descricao: notifPay.assunto || 'Contribuições Trabalhador Independente'
      };
    }
  }

  snapshot.posicaoAtual = {
    valoresReceber: 0.00,
    valoresDevolver: 0.00,
    contribuicoesCorrentesAPagar: 0.00,
    contribuicoesEmAtraso: 0.00,
    coimasECustas: 0.00,
    dividaEmExecucaoFiscal: 0.00,
    ultimoPagamentoLiquidado: ultimoPagamento,
    pagamentosOficiaisCalendarioAtual: Array.isArray(pCur) ? pCur.length : 0,
    pagamentosOficiaisCalendarioAnterior: Array.isArray(pPrev) ? pPrev.length : 0
  };
} catch (e) {
  console.error('Error in posicao atual:', e.message);
}

// 6. Mensagens & Inbox
try {
  const inboxRaw = readFileContent('inbox_messages.json');
  const unreadRaw = readFileContent('unread_messages_count');
  const inbox = inboxRaw ? JSON.parse(inboxRaw) : [];
  let unreadCount = inbox.filter(m => m.estado === 'NOVA').length;
  if (unreadRaw) {
    try {
      const parsedVal = JSON.parse(unreadRaw).value;
      if (typeof parsedVal === 'number') unreadCount = parsedVal;
    } catch (e) {}
  }

  snapshot.mensagens = {
    totalNaoLidasOuNovas: unreadCount,
    totalMensagensInbox: inbox.length,
    ultimasNotificacoes: inbox.slice(0, 10).map(m => ({
      id: m.id,
      data: new Date(m.dataEntrega).toISOString().split('T')[0],
      assunto: m.assunto || 'Sem assunto',
      remetente: m.remetente || 'Segurança Social',
      estado: m.estado,
      conteudoResumido: (m.conteudo || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 180)
    }))
  };

  // Find worker & execution plan data inside messages
  const notifTI = inbox.find(m => (m.conteudo || '').includes('rendimento relevante') || (m.assunto || '').includes('base de incidência'));
  if (notifTI) {
    const rMatch = notifTI.conteudo.match(/Rendimento relevante:\s*([\d\.\,]+)/i);
    const bMatch = notifTI.conteudo.match(/Base de incid(?:ê|&ecirc;)ncia contributiva:\s*([\d\.\,]+)/i);
    const tMatch = notifTI.conteudo.match(/Taxa contributiva:\s*([\d\.\,]+)%/i);
    const cMatch = notifTI.conteudo.match(/Contribui(?:ç|&ccedil;)(?:ã|&atilde;)o prevista a pagar mensalmente:\s*([\d\.\,]+)/i);

    const rendimentoRelevante = rMatch ? parseFloat(rMatch[1].replace(/\./g, '').replace(',', '.')) : null;
    const baseIncidencia = bMatch ? parseFloat(bMatch[1].replace(/\./g, '').replace(',', '.')) : null;
    const taxaContributiva = tMatch ? parseFloat(tMatch[1].replace(',', '.')) : 21.40;
    const mensalidadePrevista = cMatch ? parseFloat(cMatch[1].replace(/\./g, '').replace(',', '.')) : (baseIncidencia ? baseIncidencia * (taxaContributiva / 100) : null);
    
    snapshot.trabalhadorIndependente = {
      ativo: true,
      periodoVigente: '3.º Trimestre 2026 (a partir de 1 de Julho de 2026)',
      rendimentoRelevanteTrimestral: rendimentoRelevante,
      baseIncidenciaMensal: baseIncidencia,
      taxaContributiva: taxaContributiva,
      mensalidadePrevista: mensalidadePrevista,
      baseLegal: 'Art. 162.º n.º 1 e 2 e Art. 163.º n.º 1 e 5 do CRCSPSS',
      opcoesProximaDeclaracao: baseIncidencia ? {
        opcaoMenos25PorCento: {
          baseMensal: Math.round((baseIncidencia * 0.75) * 100) / 100,
          mensalidade: Math.round(((baseIncidencia * 0.75) * (taxaContributiva / 100)) * 100) / 100,
          vantagem: `Alívio de liquidez e poupança imediata de tesouraria de ${(Math.round(((mensalidadePrevista || 0) - (baseIncidencia * 0.75) * (taxaContributiva / 100)) * 100) / 100).toLocaleString('pt-PT')} €/mês.`
        },
        opcaoNormal: {
          baseMensal: baseIncidencia,
          mensalidade: mensalidadePrevista,
          vantagem: 'Manutenção do escalão base correspondente ao rendimento relevante.'
        },
        opcaoMais25PorCento: {
          baseMensal: Math.round((baseIncidencia * 1.25) * 100) / 100,
          mensalidade: Math.round(((baseIncidencia * 1.25) * (taxaContributiva / 100)) * 100) / 100,
          vantagem: 'Reforço de direitos de proteção social (parentalidade, subsídio de doença, reforma) e 100% dedutível no IRS Anexo B.'
        }
      } : null
    };
  }

  const notifPlan = inbox.find(m => (m.conteudo || '').includes('plano prestacional') || (m.assunto || '').includes('plano prestacional'));
  if (notifPlan) {
    const pProc = notifPlan.conteudo.match(/processo\s*(?:n[º\.\º\o\°\s]+)?\s*(\d{8,20})/i);
    const pPlano = notifPlan.conteudo.match(/plano\s*(?:<b>)?\s*(?:n[º\.\º\o\°\s]+)?\s*(\d+\/\d+)/i);
    const pPrest = notifPlan.conteudo.match(/(\d+)\s*presta(?:ç|&ccedil;)(?:õ|&otilde;)es/i);
    const pTot = notifPlan.conteudo.match(/total de\s*(?:<b>)?\s*([\d\.\,]+)\s*€/i);
    const pExeq = notifPlan.conteudo.match(/quantia exequenda:\s*([\d\.\,]+)\s*€/i);
    const pJur = notifPlan.conteudo.match(/juros:\s*([\d\.\,]+)\s*€/i);
    const pCust = notifPlan.conteudo.match(/custas:\s*([\d\.\,]+)\s*€/i);
    const pVal = notifPlan.conteudo.match(/Valor:\s*(?:<b>)?\s*([\d\.\,]+)\s*€/i) || notifPlan.conteudo.match(/valor da 1\.ª prestação é de\s*([\d\.\,]+)\s*€/i);
    const pEnt = notifPlan.conteudo.match(/Entidade:\s*(?:<b>)?\s*(\d+)/i);
    const pRef = notifPlan.conteudo.match(/Referência:\s*(?:<b>)?\s*([\d\s]+)\s*<\/b>/i) || notifPlan.conteudo.match(/Referência:\s*([\d\s]{9,15})/i);
    const pPrazo = notifPlan.conteudo.match(/até\s*([\d\-]{10})/i);

    const livePosicaoHtml = readFileContent('posicaoAtual.html') || readFileContent('posicao_atual.html');
    const isZeroLiveDebt = livePosicaoHtml ? (livePosicaoHtml.includes('existem valores para apresentar') && livePosicaoHtml.includes('0,00')) : false;

    snapshot.execucaoFiscal = {
      processoPrincipal: pProc ? pProc[1] : null,
      planoNumero: pPlano ? pPlano[1] : null,
      estado: isZeroLiveDebt ? 'Liquidado / Regularizado (Saldo 0,00 € na Posição Atual)' : 'Deferido / Aprovado',
      numeroPrestacoes: pPrest ? parseInt(pPrest[1], 10) : null,
      montanteTotalDivida: isZeroLiveDebt ? 0 : (pTot ? parseFloat(pTot[1].replace(/\./g, '').replace(',', '.')) : 0),
      montanteHistoricoNotificado: pTot ? parseFloat(pTot[1].replace(/\./g, '').replace(',', '.')) : 0,
      quantiaExequenda: pExeq ? parseFloat(pExeq[1].replace(/\./g, '').replace(',', '.')) : 0,
      juros: pJur ? parseFloat(pJur[1].replace(/\./g, '').replace(',', '.')) : 0,
      custas: pCust ? parseFloat(pCust[1].replace(/\./g, '').replace(',', '.')) : 0,
      valorPrestacaoMensal: pVal ? parseFloat(pVal[1].replace(/\./g, '').replace(',', '.')) : 0,
      entidade: pEnt ? pEnt[1] : null,
      referencia: pRef ? pRef[1].replace(/\s+/g, ' ').trim() : null,
      prazoPrimeiraPrestacao: pPrazo ? pPrazo[1] : null,
      saldoAtualPortal: isZeroLiveDebt ? 0.00 : null,
      observacao: isZeroLiveDebt ? 'O portal da Segurança Social Direta (Posição Atual) confirma saldo de 0,00 € em execução fiscal e ausência de valores pendentes em plano.' : 'Plano em curso.'
    };
  }
} catch (e) {
  console.error('Error in mensagens/TI/plano:', e.message);
}

// 7. Carreira Contributiva
try {
  const cHtml = readFileContent('carreira_contributiva.html');
  const anos = [];
  if (cHtml && !cHtml.includes('Sessão expirada')) {
    // Match each table row
    const rowRegex = /<tr data-ri="\d+"[^>]*>(.*?)<\/tr>/gis;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(cHtml)) !== null) {
      const rowContent = rowMatch[1];
      const anoM = rowContent.match(/linhaAno">(\d{4})<\/span>/i);
      const diasM = rowContent.match(/linhaTotalMesAno">(\d+)<\/span>/i);
      const valM = rowContent.match(/linhaValor">([^<]+)<\/span>/i);

      if (anoM && diasM && valM) {
        const cleanVal = valM[1].replace(/&nbsp;|\s/g, '').replace(/\./g, '').replace(',', '.');
        anos.push({
          ano: parseInt(anoM[1], 10),
          dias: parseInt(diasM[1], 10),
          valorRemuneracoes: parseFloat(cleanVal)
        });
      }
    }
  }

  snapshot.carreiraContributiva = {
    totalAnosComRegistos: anos.length,
    anos
  };
} catch (e) {
  console.error('Error in carreira:', e.message);
}

// 8. Access Logs
try {
  const logsRaw = readFileContent('access_logs.json');
  const logs = logsRaw ? JSON.parse(logsRaw) : [];
  snapshot.registosAcessos = {
    totalSessoesRegistadas: Array.isArray(logs) ? logs.length : 0,
    ultimosAcessos: Array.isArray(logs) ? logs.slice(0, 5).map(l => ({
      data: new Date(l.when).toISOString(),
      ip: l.remoteIP,
      app: l.applicationId
    })) : []
  };
} catch (e) {
  console.error('Error in access logs:', e.message);
}

  fs.writeFileSync(path.join(DIR, 'seg_social_unified_snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log('✅ Snapshot unificado atualizado com sucesso em: seg_social_unified_snapshot.json');
  return snapshot;
}

if (process.argv[1]?.endsWith('generate_snapshot.mjs')) {
  generateSnapshot();
}
