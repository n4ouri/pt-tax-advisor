/**
 * Personal AT & Segurança Social Intelligence & Advisory Engine
 * Manifest V3 Compatible ES Module
 * 
 * Enhanced with Autónomo Specialist Law:
 * - CIRS (Art. 31º n.º 10, Art. 31º n.º 13, Art. 78º, Art. 101º, Art. 102º)
 * - CRCSPSS (Art. 139º-168º - Bases, Escalões -25%/+25%)
 * - CIVA (Art. 6º n.º 6, Art. 53º, VIES Reverse Charge)
 * - IRC (Taxa PME 17%, Subsídio Alimentação, Ajudas de Custo)
 */

export const DEDUCTION_CAPS = {
  despesasGerais: { label: 'Despesas Gerais Familiares', rate: 0.35, maxSingle: 250, maxCouple: 500, cirs: 'Art. 78º-B CIRS' },
  saude: { label: 'Saúde e Seguros de Saúde', rate: 0.15, max: 1000, cirs: 'Art. 78º-C CIRS' },
  educacao: { label: 'Educação e Formação', rate: 0.30, max: 800, maxDisplaced: 1000, cirs: 'Art. 78º-D CIRS' },
  habitacao: { label: 'Habitação (Rendas / Juros)', rate: 0.15, maxRent: 600, maxHighIncomeRent: 900, cirs: 'Art. 78º-E CIRS' },
  lares: { label: 'Lares e Apoio Domiciliário', rate: 0.25, max: 403.75, cirs: 'Art. 78º-F CIRS' },
  ivaBeneficio: {
    label: 'Exigência de Fatura (Benefício IVA: Restauração, Auto, Passes, Cabeleireiros, Ginásios)',
    rateGeneral: 0.15,
    ratePasses: 1.00,
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

export const DEADLINES_CALENDAR = [
  { month: 1, day: 31, title: 'Segurança Social - Declaração Trimestral T4', source: 'SS' },
  { month: 2, day: 15, title: 'e-Fatura - Comunicação de Faturas de Rendas/Contratos', source: 'AT' },
  { month: 2, day: 25, title: 'e-Fatura - Validação Final de Faturas Pendentes', source: 'AT' },
  { month: 2, day: 20, title: 'IVA - Declaração Periódica T4 (Trimestral)', source: 'AT' },
  { month: 3, day: 15, title: 'AT - Reclamação Prévia de Despesas Gerais Familiares', source: 'AT' },
  { month: 4, day: 1, endMonth: 6, endDay: 30, title: 'IRS - Entrega da Declaração Modelo 3', source: 'AT' },
  { month: 4, day: 30, title: 'Segurança Social - Declaração Trimestral T1', source: 'SS' },
  { month: 5, day: 20, title: 'IVA - Declaração Periódica T1 (Trimestral)', source: 'AT' },
  { month: 5, day: 31, title: 'IMI - 1ª Prestação (ou Pagamento Único se < 100€)', source: 'AT' },
  { month: 7, day: 20, title: 'IRS - 1.º Pagamento por Conta (PPC - Art. 102º CIRS)', source: 'AT' },
  { month: 7, day: 31, title: 'Segurança Social - Declaração Trimestral T2', source: 'SS' },
  { month: 8, day: 20, title: 'IVA - Declaração Periódica T2 (Trimestral)', source: 'AT' },
  { month: 8, day: 31, title: 'IRS - Prazo Limite para Liquidação / Reembolso pela AT', source: 'AT' },
  { month: 9, day: 20, title: 'IRS - 2.º Pagamento por Conta (PPC - Art. 102º CIRS)', source: 'AT' },
  { month: 9, day: 30, title: 'IMI - 2ª Prestação (se aplicável)', source: 'AT' },
  { month: 10, day: 31, title: 'Segurança Social - Declaração Trimestral T3', source: 'SS' },
  { month: 11, day: 20, title: 'IVA - Declaração Periódica T3 (Trimestral)', source: 'AT' },
  { month: 11, day: 30, title: 'IMI - 3ª Prestação (se valor > 500€)', source: 'AT' },
  { month: 12, day: 20, title: 'IRS - 3.º Pagamento por Conta (PPC - Limitável se imposto coberto)', source: 'AT' },
  { month: 12, day: 31, title: 'PPR - Prazo Limite para Reforço e Dedução no IRS do Ano', source: 'AT' }
];

export function generateAdvisorReport(data) {
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
  const currentDay = now.getDate();

  // 1. ANALYZE SEGURANÇA SOCIAL
  if (data?.segSocial) {
    const ss = data.segSocial;
    taxSummary.ssStatus = ss.situacaoContributiva || 'Regularizada';

    if (ss.situacaoContributiva === 'Não Regularizada' || ss.situacaoContributiva === 'Irregular') {
      taxSummary.healthScore -= 40;
      alerts.push({
        level: 'CRITICAL',
        badge: 'Segurança Social',
        title: 'Situação Contributiva NÃO Regularizada',
        description: 'Existe uma irregularidade ou dívida pendente na Segurança Social Direta. Isto impede a emissão de certidão de não-dívida, bloqueia apoios estatais e pode gerar juros de mora e penhora.',
        action: 'Aceder a Conta-Corrente > Posição Atual e verificar referências de pagamento em atraso ou solicitar Acordo Prestacional.'
      });
    }

    if (ss.dividas && ss.dividas.total > 0) {
      taxSummary.totalDebts += ss.dividas.total;
      taxSummary.healthScore -= 20;
      alerts.push({
        level: 'HIGH',
        badge: 'Dívida SS',
        title: `Dívida ativa na Segurança Social: ${formatCurrency(ss.dividas.total)}`,
        description: `Montante em cobrança: ${formatCurrency(ss.dividas.total)}. Juros de mora legais acumulam mensalmente à taxa legal.`,
        action: 'Regularizar de imediato por Multibanco/MBWay ou requerer plano de prestações (Art. 196º CRCSPSS).'
      });
    }

    if (ss.execucaoFiscal && ss.execucaoFiscal.montanteTotalDivida > 0) {
      const ef = ss.execucaoFiscal;
      alerts.push({
        level: 'HIGH',
        badge: 'Execução Fiscal SS',
        title: `Plano Prestacional em Execução Fiscal: Processo ${ef.processoPrincipal}`,
        description: `Plano n.º ${ef.planoNumero} (${ef.numeroPrestacoes} prestações de ${formatCurrency(ef.valorPrestacaoMensal)}). Montante: ${formatCurrency(ef.montanteTotalDivida)}.`,
        action: 'Assegurar o pagamento rigoroso até ao final de cada mês. A falta de 1 prestação implica rescisão e penhora (Art. 200º n.º 4 CPPT).'
      });
    }

    // SS Independent Worker Optimization (+/- 25% variation)
    if (ss.trabalhadorIndependente) {
      const ti = ss.trabalhadorIndependente;
      const trimestralIncome = ti.rendimentoRelevanteTrimestral || ti.ultimoRendimentoTrimestral || 0;
      const baseCalculada = ti.baseIncidenciaMensal || (trimestralIncome > 0 ? trimestralIncome / 3 : 0);
      const standardMonthlyContribution = ti.mensalidadePrevista || (baseCalculada > 0 ? baseCalculada * 0.214 : 0);

      if (baseCalculada > 0) {
        opportunities.push({
          category: 'Optimização Segurança Social (Recibos Verdes)',
          title: 'Ajuste de Escalão (-25% ou +25%) na Declaração Trimestral',
          impact: 'Gestão de Liquidez & Benefícios',
          description: `Com base de incidência de ${formatCurrency(baseCalculada)}/mês, a sua contribuição mensal normal é ${formatCurrency(standardMonthlyContribution)}.\n• Se necessita de liquidez imediata: Pode reduzir a base em 25%, passando a pagar ${formatCurrency(standardMonthlyContribution * 0.75)}/mês (poupança de ${formatCurrency((standardMonthlyContribution * 0.25) * 12)}/ano).\n• Se pretende aumentar a dedução de despesas no IRS e reforçar futura baixa/parentalidade/reforma: Pode aumentar em +25% para ${formatCurrency(standardMonthlyContribution * 1.25)}/mês. As contribuições à SS são deduzidas a 100% no Anexo B do IRS.`,
          rule: 'Artigo 163º do Código dos Regimes Contributivos (CRCSPSS)'
        });
      }
    }
  }

  // 2. ANALYZE AT / PORTAL DAS FINANÇAS
  if (data?.at) {
    const at = data.at;
    taxSummary.fiscalStatus = at.situacaoFiscal || 'Regularizada';

    if (at.dividas && at.dividas.total > 0) {
      taxSummary.totalDebts += at.dividas.total;
      taxSummary.healthScore -= 35;
      alerts.push({
        level: 'CRITICAL',
        badge: 'AT / Finanças',
        title: `Dívida Fiscal Ativa: ${formatCurrency(at.dividas.total)}`,
        description: `Existem processos de execução fiscal ou liquidações em dívida no valor total de ${formatCurrency(at.dividas.total)}. A AT pode compensar automaticamente este montante contra qualquer reembolso de IRS futuro ou emitir penhoras de contas bancárias.`,
        action: 'Consultar "Dívidas Fiscais / Pagamentos em Falta" e emitir DUC (Documento Único de Cobrança) ou pedir pagamento em prestações no Portal das Finanças.'
      });
    }

    // Category B expense justification check (Regime Simplificado CIRS Art. 31º n.º 13)
    if (at.regimeSimplificado && at.regimeSimplificado.rendimentoServicos > 0) {
      const grossServices = at.regimeSimplificado.rendimentoServicos;
      const targetExpenses = grossServices * 0.15;
      const currentJustified = (at.regimeSimplificado.despesasAtividade || 0) + (at.regimeSimplificado.contribuicoesSS || 0) + 4104;
      const deficit = Math.max(0, targetExpenses - currentJustified);

      if (deficit > 0) {
        taxSummary.healthScore -= 15;
        opportunities.push({
          category: 'IRS Categoria B - Regime Simplificado',
          title: `Falta justificar ${formatCurrency(deficit)} de Despesas de Atividade`,
          impact: `Evitar tributação extra no IRS (até ${formatCurrency(deficit * 0.48)})`,
          description: `No Regime Simplificado (coeficiente 0.75), a lei exige que 15% do rendimento bruto seja justificado por despesas afetas à atividade, contribuições da Segurança Social ou dedução específica de 4.104€. Falta-lhe justificar ${formatCurrency(deficit)}. Se não registar faturas afetas com o seu NIF, o seu rendimento tributável será agravado.`,
          action: 'Afete faturas de comunicações, deslocações, material informático, rendas e formação à sua atividade no e-Fatura.',
          rule: 'Artigo 31º, n.º 13 do CIRS'
        });
      }
    }
  }

  // 3. ANALYZE E-FATURA & DEDUCTIONS MAXING
  if (data?.efatura) {
    const ef = data.efatura;
    const cat = ef.categorias || {};

    if (ef.faturasPendentes > 0) {
      taxSummary.pendingInvoicesCount = ef.faturasPendentes;
      taxSummary.healthScore -= Math.min(20, ef.faturasPendentes * 2);
      alerts.push({
        level: 'MEDIUM',
        badge: 'e-Fatura',
        title: `${ef.faturasPendentes} Faturas com Validação Pendente`,
        description: `Tem ${ef.faturasPendentes} faturas emitidas com o seu NIF sem setor atribuído (empresas com CAE múltiplo). Enquanto não forem validadas, não contam para as deduções de Saúde, Educação, Restauração ou Habitação.`,
        action: 'Aceder ao e-Fatura > Validar Faturas e associar o setor correto.'
      });
    }

    const categoriesAnalysis = [
      { id: 'despesasGerais', name: DEDUCTION_CAPS.despesasGerais.label, current: cat.despesasGerais || 0, max: DEDUCTION_CAPS.despesasGerais.maxSingle, cirs: DEDUCTION_CAPS.despesasGerais.cirs },
      { id: 'saude', name: DEDUCTION_CAPS.saude.label, current: cat.saude || 0, max: DEDUCTION_CAPS.saude.max, cirs: DEDUCTION_CAPS.saude.cirs },
      { id: 'educacao', name: DEDUCTION_CAPS.educacao.label, current: cat.educacao || 0, max: DEDUCTION_CAPS.educacao.max, cirs: DEDUCTION_CAPS.educacao.cirs },
      { id: 'habitacao', name: DEDUCTION_CAPS.habitacao.label, current: cat.habitacao || 0, max: DEDUCTION_CAPS.habitacao.maxRent, cirs: DEDUCTION_CAPS.habitacao.cirs },
      { id: 'ivaBeneficio', name: DEDUCTION_CAPS.ivaBeneficio.label, current: cat.ivaBeneficio || 0, max: DEDUCTION_CAPS.ivaBeneficio.max, cirs: DEDUCTION_CAPS.ivaBeneficio.cirs }
    ];

    let totalRemaining = 0;
    let totalDeducted = 0;

    categoriesAnalysis.forEach(c => {
      totalDeducted += Math.min(c.current, c.max);
      const remaining = Math.max(0, c.max - c.current);
      totalRemaining += remaining;

      if (remaining > 50 && currentMonth >= 6) {
        opportunities.push({
          category: 'Maximização de Dedução IRS',
          title: `${c.name}: Margem de ${formatCurrency(remaining)} por atingir`,
          impact: `Aumentar Reembolso IRS em ${formatCurrency(remaining)}`,
          description: `Ainda não atingiu o teto legal de ${formatCurrency(c.max)} nesta categoria (tem atualmente ${formatCurrency(c.current)} deduzidos). Peça fatura com NIF nos respetivos estabelecimentos para esgotar o teto legal.`,
          rule: c.cirs
        });
      }
    });

    taxSummary.totalDeductionsAccumulated = totalDeducted;
    taxSummary.potentialDeductionsRemaining = totalRemaining;

    if (currentMonth >= 8) {
      opportunities.push({
        category: 'Optimização Fiscal IRS - PPR',
        title: 'Dedução à Coleta com PPR (Plano Poupança Reforma)',
        impact: 'Poupança Fiscal Direta até 400€ no IRS',
        description: `Pode deduzir 20% do valor aplicado num PPR no IRS deste ano fiscal:\n• < 35 anos: investir 2.000€ deduz 400€ no IRS.\n• 35 a 50 anos: investir 1.750€ deduz 350€ no IRS.\n• > 50 anos: investir 1.500€ deduz 300€ no IRS.`,
        rule: 'Artigo 21º do Estatuto dos Benefícios Fiscais (EBF)'
      });
    }
  }

  // 4. STRATEGIC AUTÓNOMO / CORPORATE ADVISOR (Advanced Layer)
  opportunities.push({
    category: 'Regime Simplificado - Início de Atividade',
    title: 'Desconto de 50% / 25% na Matéria Coletável (1.º e 2.º Ano)',
    impact: 'Poupança de IRS de até 50% no rendimento tributável',
    description: 'No ano de início de atividade independente e no ano subsequente, o coeficiente do Regime Simplificado é reduzido em 50% (passando de 0.75 para 0.375) e em 25% no 2.º ano (0.5625).',
    rule: 'Artigo 31.º, n.º 10 do CIRS'
  });

  opportunities.push({
    category: 'Fiscalidade Internacional & Clientes UE/Fora da UE',
    title: 'Regras de Localização do IVA & Isenção VIES / Reverse Charge',
    impact: 'Faturação a 0% IVA com menções legais obrigatórias',
    description: 'Para clientes B2B na UE com NIF VIES válido: autoliquidação nos termos do Art. 6.º, n.º 6 al. a) do CIVA e entrega da Declaração Recapitulativa VIES. Para clientes fora da UE (EUA, UK): não sujeição em Portugal com menção de autoliquidação.',
    rule: 'Artigo 6.º, n.º 6, alínea a) do CIVA & Diretiva 2006/112/CE'
  });

  // 5. UPCOMING DEADLINES RADAR
  const upcomingDeadlines = DEADLINES_CALENDAR.filter(d => {
    if (d.month === currentMonth && d.day >= currentDay) return true;
    if (d.month === (currentMonth % 12) + 1 && currentDay >= 15) return true;
    if (d.endMonth && currentMonth >= d.month && currentMonth <= d.endMonth) return true;
    return false;
  });

  taxSummary.healthScore = Math.max(0, Math.min(100, taxSummary.healthScore));

  return {
    generatedAt: now.toISOString(),
    taxSummary,
    alerts,
    opportunities,
    recommendations,
    upcomingDeadlines
  };
}

export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
