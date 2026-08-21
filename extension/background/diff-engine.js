/**
 * Time-Series Snapshot Diff Engine
 * 
 * Compares current vs previous snapshots and generates delta events
 * for instant notifications and change logs.
 */

export function diffSnapshots(previousSnapshot, currentSnapshot) {
  const diffs = [];

  if (!previousSnapshot) {
    return [
      {
        type: 'INITIAL_SNAPSHOT',
        source: currentSnapshot.source,
        message: `Primeiro registo gravado para ${currentSnapshot.source}.`
      }
    ];
  }

  const prev = previousSnapshot.data || {};
  const curr = currentSnapshot.data || {};

  // Check Segurança Social status transitions
  if (currentSnapshot.source === 'SS') {
    if (prev.situacaoContributiva && curr.situacaoContributiva && prev.situacaoContributiva !== curr.situacaoContributiva) {
      diffs.push({
        type: 'STATUS_CHANGE',
        source: 'SS',
        severity: curr.situacaoContributiva === 'Regularizada' ? 'POSITIVE' : 'CRITICAL',
        title: 'Alteração na Situação Contributiva (SS)',
        message: `A sua situação contributiva mudou de "${prev.situacaoContributiva}" para "${curr.situacaoContributiva}".`
      });
    }

    // SS Debts
    const prevDebt = prev.dividas?.total || 0;
    const currDebt = curr.dividas?.total || 0;
    if (currDebt > prevDebt) {
      diffs.push({
        type: 'NEW_DEBT',
        source: 'SS',
        severity: 'CRITICAL',
        title: 'Nova Dívida na Segurança Social',
        message: `Surgiu uma nova dívida de ${formatCurrency(currDebt - prevDebt)} na Segurança Social. Total atual: ${formatCurrency(currDebt)}.`
      });
    } else if (currDebt < prevDebt && prevDebt > 0) {
      diffs.push({
        type: 'DEBT_RESOLVED',
        source: 'SS',
        severity: 'POSITIVE',
        title: 'Dívida Regularizada na Segurança Social',
        message: `Foi registada uma redução/regularização de ${formatCurrency(prevDebt - currDebt)} na dívida da Segurança Social.`
      });
    }
  }

  // Check AT / Finanças status transitions
  if (currentSnapshot.source === 'AT') {
    if (prev.situacaoFiscal && curr.situacaoFiscal && prev.situacaoFiscal !== curr.situacaoFiscal) {
      diffs.push({
        type: 'STATUS_CHANGE',
        source: 'AT',
        severity: curr.situacaoFiscal === 'Regularizada' ? 'POSITIVE' : 'CRITICAL',
        title: 'Alteração na Situação Fiscal (AT)',
        message: `A sua situação fiscal na AT mudou de "${prev.situacaoFiscal}" para "${curr.situacaoFiscal}".`
      });
    }

    // AT Debts
    const prevDebt = prev.dividas?.total || 0;
    const currDebt = curr.dividas?.total || 0;
    if (currDebt > prevDebt) {
      diffs.push({
        type: 'NEW_DEBT',
        source: 'AT',
        severity: 'CRITICAL',
        title: 'Nova Dívida Fiscal na AT',
        message: `Foi instaurado um novo processo de dívida/execução fiscal no valor de ${formatCurrency(currDebt - prevDebt)}. Total atual: ${formatCurrency(currDebt)}.`
      });
    } else if (currDebt < prevDebt && prevDebt > 0) {
      diffs.push({
        type: 'DEBT_RESOLVED',
        source: 'AT',
        severity: 'POSITIVE',
        title: 'Dívida Fiscal Regularizada na AT',
        message: `Foi liquidado o montante de ${formatCurrency(prevDebt - currDebt)} em dívida fiscal.`
      });
    }

    // New declarations delivered
    const prevDeclarationsCount = (prev.declaracoes || []).length;
    const currDeclarationsCount = (curr.declaracoes || []).length;
    if (currDeclarationsCount > prevDeclarationsCount) {
      const newItems = curr.declaracoes.slice(prevDeclarationsCount);
      diffs.push({
        type: 'NEW_DECLARATION',
        source: 'AT',
        severity: 'INFO',
        title: 'Nova Declaração Submetida/Processada',
        message: `Foi registada nova declaração: ${newItems.map(d => d.tipo || d.nome).join(', ')}.`
      });
    }
  }

  // Check e-Fatura
  if (currentSnapshot.source === 'EFATURA') {
    const prevPending = prev.faturasPendentes || 0;
    const currPending = curr.faturasPendentes || 0;
    if (currPending > prevPending) {
      diffs.push({
        type: 'PENDING_INVOICES',
        source: 'EFATURA',
        severity: 'MEDIUM',
        title: 'Novas Faturas Pendentes de Validação',
        message: `Tem ${currPending - prevPending} novas faturas no e-Fatura a aguardar classificação setorial.`
      });
    }
  }

  return diffs;
}

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
