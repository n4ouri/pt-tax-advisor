/**
 * Node.js CLI Advisor Engine (Enhanced with Autónomo & Legal Intelligence)
 */

import { analyzeAutonomoProfile, formatEUR } from './autonomo-advisor.js';

export const DEDUCTION_CAPS = {
  despesasGerais: { label: 'Despesas Gerais Familiares', rate: 0.35, maxSingle: 250, maxCouple: 500, cirs: 'Art. 78º-B CIRS' },
  saude: { label: 'Saúde e Seguros de Saúde', rate: 0.15, max: 1000, cirs: 'Art. 78º-C CIRS' },
  educacao: { label: 'Educação e Formação', rate: 0.30, max: 800, maxDisplaced: 1000, cirs: 'Art. 78º-D CIRS' },
  habitacao: { label: 'Habitação (Rendas / Juros)', rate: 0.15, maxRent: 600, maxHighIncomeRent: 900, cirs: 'Art. 78º-E CIRS' },
  lares: { label: 'Lares e Apoio Domiciliário', rate: 0.25, max: 403.75, cirs: 'Art. 78º-F CIRS' },
  ivaBeneficio: {
    label: 'Exigência de Fatura (Benefício IVA: Restauração, Auto, Passes, Cabeleireiros, Ginásios)',
    max: 250,
    cirs: 'Art. 78º-F (IVA)'
  },
  ppr: {
    label: 'Plano Poupança Reforma (PPR)',
    rate: 0.20,
    maxUnder35: 400,
    max35to50: 350,
    maxOver50: 300,
    cirs: 'Art. 21º EBF'
  }
};

export function runAdvisorAnalysis(data) {
  const recommendations = [];
  const alerts = [];
  const opportunities = [];
  const taxSummary = {
    fiscalStatus: 'Regularizada',
    ssStatus: 'Regularizada',
    totalDebts: 0,
    totalDeductionsAccumulated: 0,
    potentialDeductionsRemaining: 0,
    pendingInvoicesCount: 0,
    healthScore: 100
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // 1. SEGURANÇA SOCIAL
  if (data?.segSocial) {
    const ss = data.segSocial;
    taxSummary.ssStatus = ss.situacaoContributiva || 'Regularizada';

    if (ss.situacaoContributiva === 'Não Regularizada' || ss.situacaoContributiva === 'Irregular') {
      taxSummary.healthScore -= 40;
      alerts.push({
        level: 'CRITICAL',
        source: 'Segurança Social Direta',
        title: 'Situação Contributiva NÃO Regularizada',
        description: 'Existem contribuições em atraso ou declarações omissas. Impede certidão de não dívida e acarreta juros de mora.',
        action: 'Emitir DUC/Multibanco na Segurança Social Direta > Conta-Corrente ou solicitar Acordo Prestacional.'
      });
    }

    if (ss.dividas && ss.dividas.total > 0) {
      taxSummary.totalDebts += ss.dividas.total;
      taxSummary.healthScore -= 20;
      alerts.push({
        level: 'HIGH',
        source: 'Segurança Social Direta',
        title: `Dívida ativa na Segurança Social: ${formatCurrency(ss.dividas.total)}`,
        description: `Montante em cobrança: ${formatCurrency(ss.dividas.total)}.`,
        action: 'Regularizar de imediato por Multibanco ou requerer plano de prestações (Art. 196º CRCSPSS).'
      });
    }

    if (ss.execucaoFiscal) {
      const ef = ss.execucaoFiscal;
      alerts.push({
        level: 'HIGH',
        source: 'Execução Fiscal SS (SEF)',
        title: `Plano Prestacional em Execução Fiscal Ativo: Processo ${ef.processoPrincipal}`,
        description: `Plano n.º ${ef.planoNumero} (${ef.numeroPrestacoes} prestações mensais de ${formatCurrency(ef.valorPrestacaoMensal)}). Dívida total: ${formatCurrency(ef.montanteTotalDivida)}.`,
        action: 'Assegurar pagamento pontual até ao final de cada mês. A falta de 1 prestação causa rescisão do plano e penhora (Art. 200º n.º 4 CPPT).'
      });
    }

    if (ss.trabalhadorIndependente) {
      const ti = ss.trabalhadorIndependente;
      const income = ti.rendimentoRelevanteTrimestral || ti.ultimoRendimentoTrimestral || 0;
      const baseCalc = ti.baseIncidenciaMensal || (income > 0 ? income / 3 : 0);
      const standardMonthly = ti.mensalidadePrevista || (baseCalc > 0 ? baseCalc * 0.214 : 0);

      if (baseCalc > 0) {
        opportunities.push({
          category: 'Optimização Segurança Social (Trabalhador Independente)',
          title: 'Ajuste Estratégico de Escalão (-25% ou +25%) na Declaração Trimestral',
          impact: 'Gestão de Liquidez & Benefícios Sociais',
          description: `Com base na sua base de incidência (${formatCurrency(baseCalc)}/mês):\n• Opção -25%: ${formatCurrency(standardMonthly * 0.75)}/mês (alivia ${formatCurrency((standardMonthly - standardMonthly * 0.75) * 12)}/ano de tesouraria imediata)\n• Opção Normal: ${formatCurrency(standardMonthly)}/mês\n• Opção +25%: ${formatCurrency(standardMonthly * 1.25)}/mês (100% dedutível no IRS Anexo B e maximiza proteção social / licença parentalidade / reforma)`,
          rule: 'Artigo 163º do Código dos Regimes Contributivos'
        });
      }
    }
  }

  // 2. AT / PORTAL DAS FINANÇAS
  if (data?.at) {
    const at = data.at;
    taxSummary.fiscalStatus = at.situacaoFiscal || 'Regularizada';

    if (at.dividas && at.dividas.total > 0) {
      taxSummary.totalDebts += at.dividas.total;
      taxSummary.healthScore -= 35;
      alerts.push({
        level: 'CRITICAL',
        source: 'Autoridade Tributária (AT)',
        title: `Dívida Fiscal Ativa: ${formatCurrency(at.dividas.total)}`,
        description: `Processos de execução fiscal ativos no valor de ${formatCurrency(at.dividas.total)}. Risco de penhora e retenção automática de reembolsos de IRS.`,
        action: 'Consultar Portal das Finanças > Dívidas Fiscais e emitir DUC para liquidação ou pedir pagamento em prestações.'
      });
    }

    if (at.regimeSimplificado && at.regimeSimplificado.rendimentoServicos > 0) {
      const grossServices = at.regimeSimplificado.rendimentoServicos;
      const targetExpenses = grossServices * 0.15;
      const currentJustified = (at.regimeSimplificado.despesasAtividade || 0) + (at.regimeSimplificado.contribuicoesSS || 0) + 4104;
      const deficit = Math.max(0, targetExpenses - currentJustified);

      if (deficit > 0) {
        taxSummary.healthScore -= 15;
        opportunities.push({
          category: 'IRS Categoria B - Regime Simplificado',
          title: `Falta justificar ${formatCurrency(deficit)} em Despesas de Atividade`,
          impact: `Evitar tributação acrescida no IRS (até ${formatCurrency(deficit * 0.48)})`,
          description: `No Regime Simplificado (coeficiente 0.75), 15% do rendimento deve ser justificado por despesas com NIF afetas à atividade ou contribuições SS. Falta justificar ${formatCurrency(deficit)}.`,
          action: 'Afete faturas de telecomunicações, combustível, equipamento e formação à atividade no e-Fatura.',
          rule: 'Artigo 31º, n.º 13 do CIRS'
        });
      }
    }
  }

  // 3. E-FATURA & DEDUCTIONS
  if (data?.efatura) {
    const ef = data.efatura;
    const cat = ef.categorias || {};

    if (ef.faturasPendentes > 0) {
      taxSummary.pendingInvoicesCount = ef.faturasPendentes;
      taxSummary.healthScore -= Math.min(20, ef.faturasPendentes * 2);
      alerts.push({
        level: 'MEDIUM',
        source: 'e-Fatura',
        title: `${ef.faturasPendentes} Faturas com Validação Setorial Pendente`,
        description: `Existem faturas emitidas com o seu NIF por validar. Enquanto não forem classificadas, não contam para o teto de deduções.`,
        action: 'Aceder a e-Fatura > Validar Faturas e associar a categoria correta.'
      });
    }

    const categoriesList = [
      { name: DEDUCTION_CAPS.despesasGerais.label, current: cat.despesasGerais || 0, max: DEDUCTION_CAPS.despesasGerais.maxSingle, rule: DEDUCTION_CAPS.despesasGerais.cirs },
      { name: DEDUCTION_CAPS.saude.label, current: cat.saude || 0, max: DEDUCTION_CAPS.saude.max, rule: DEDUCTION_CAPS.saude.cirs },
      { name: DEDUCTION_CAPS.educacao.label, current: cat.educacao || 0, max: DEDUCTION_CAPS.educacao.max, rule: DEDUCTION_CAPS.educacao.cirs },
      { name: DEDUCTION_CAPS.habitacao.label, current: cat.habitacao || 0, max: DEDUCTION_CAPS.habitacao.maxRent, rule: DEDUCTION_CAPS.habitacao.cirs },
      { name: DEDUCTION_CAPS.ivaBeneficio.label, current: cat.ivaBeneficio || 0, max: DEDUCTION_CAPS.ivaBeneficio.max, rule: DEDUCTION_CAPS.ivaBeneficio.cirs }
    ];

    let totalDeducted = 0;
    let totalRemaining = 0;

    categoriesList.forEach(c => {
      totalDeducted += Math.min(c.current, c.max);
      const remaining = Math.max(0, c.max - c.current);
      totalRemaining += remaining;

      if (remaining > 50) {
        opportunities.push({
          category: 'Maximização de Deduções no IRS',
          title: `${c.name}: Margem de ${formatCurrency(remaining)} por atingir`,
          impact: `Aumentar Reembolso / Reduzir IRS em até ${formatCurrency(remaining)}`,
          description: `Acumulou ${formatCurrency(c.current)} dos ${formatCurrency(c.max)} máximos permitidos por lei. Solicite fatura com NIF nos respetivos estabelecimentos para esgotar o teto legal.`,
          rule: c.rule
        });
      }
    });

    taxSummary.totalDeductionsAccumulated = totalDeducted;
    taxSummary.potentialDeductionsRemaining = totalRemaining;

    // PPR check
    if (currentMonth >= 8) {
      opportunities.push({
        category: 'Benefícios Fiscais - Poupança Reforma (PPR)',
        title: 'Dedução direta à coleta até 400€ com Plano Poupança Reforma',
        impact: 'Abatimento direto no IRS até 400€',
        description: 'Dedução de 20% do capital aplicado num PPR até 31 de Dezembro (ex: 2.000€ investidos = 400€ a menos de imposto a pagar para < 35 anos).',
        rule: 'Artigo 21º do Estatuto dos Benefícios Fiscais (EBF)'
      });
    }
  }

  // Run deep lawyer-grade autonomo analysis
  const autonomoDeep = analyzeAutonomoProfile(data);

  taxSummary.healthScore = Math.max(0, Math.min(100, taxSummary.healthScore));

  return {
    analyzedAt: now.toISOString(),
    taxSummary,
    alerts,
    opportunities,
    recommendations,
    autonomoAnalysis: autonomoDeep
  };
}

export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
