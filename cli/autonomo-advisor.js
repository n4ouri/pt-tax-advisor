/**
 * Advanced Autónomo & Independent Worker (Recibos Verdes / ENI) Tax & Legal Intelligence Engine
 * 
 * Portuguese Tax & Social Security Law Specialist:
 * - CIRS (Código do IRS - Art. 31º, 78º, 101º, 102º)
 * - CRCSPSS (Código dos Regimes Contributivos - Art. 139º-168º)
 * - CIVA (Código do IVA - Art. 6º, 29º, 53º, VIES / Reverse Charge)
 * - CPPT (Código de Procedimento e de Processo Tributário - Art. 196º, 200º)
 * - IRC (Código do IRC - PME 17%, Transição para Sociedade Unipessoal)
 */

export const AUTONOMO_CONSTANTS = {
  IAS_2026: 509.26, // Indexante dos Apoios Sociais
  SALARIO_MINIMO_2026: 870.00,
  SIMPLIFICADO_CEILING: 200000.00, // Limite para Contabilidade Organizada obrigatória
  DEDUCAO_ESPECIFICA_PADRAO: 4104.00, // CIRS Art. 31º n.º 13 alínea a)
  TAXA_SS_TRABALHADOR_INDEPENDENTE: 0.214, // 21.40% para prestadores de serviços
  TAXA_SS_PRODUTOR_BENS: 0.252, // 25.20% para empresários em nome individual com produção/venda de bens
  TAXA_RETENCAO_FONTE_PADRAO: 0.25, // 25% CIRS Art. 101º n.º 1 b)
  TAXA_RETENCAO_FONTE_REDUZIDA: 0.165, // 16.5% CIRS Art. 101º n.º 1 d)
  LIMITE_ISENCAO_IVA_ART53: 15000.00, // Limite anual de isenção Art. 53º CIVA
  TAXA_IRC_PME_REDUZIDA: 0.17, // 17% até 50.000€ matéria coletável
  TAXA_IRC_NORMAL: 0.21,
  SUBSIDIO_ALIMENTACAO_ISENTO_CARTAO: 9.60 // Por dia útil isento de IRS e SS em cartão
};

/**
 * CIRS Coefficients under Regime Simplificado (Art. 31.º CIRS)
 */
export const REGIME_SIMPLIFICADO_COEFFICIENTS = {
  SERVICOS_PROFISSIONAIS_ESPECIFICOS: 0.75, // Art. 31º n.º 1 b) (Arquitetos, Engenheiros, TI, Consultores, Médicos, etc. - Tabela Art. 151º)
  OUTRAS_PRESTACOES_SERVICOS: 0.35, // Art. 31º n.º 1 c) (Outras prestações de serviços não especificadas)
  VENDAS_MERCADORIAS_PRODUTOS: 0.15, // Art. 31º n.º 1 a)
  ALOJAMENTO_LOCAL_ZONA_CONTENCAO: 0.50,
  ALOJAMENTO_LOCAL_OUTRAS_ZONAS: 0.35,
  SUBSIDIOS_EXPLORACAO: 0.10
};

/**
 * Comprehensive Autónomo Analysis & Optimization Generator
 */
export function analyzeAutonomoProfile(data) {
  const findings = {
    profileType: 'Trabalhador Independente (Categoria B / Recibos Verdes)',
    healthIndex: 100,
    metrics: {},
    alerts: [],
    optimizationStrategies: [],
    legalTricksAndProtections: [],
    companyTransitionAnalysis: {},
    internationalVIESCompliance: {}
  };

  const grossIncomeQuarter = data?.segSocial?.trabalhadorIndependente?.rendimentoRelevanteTrimestral || 
                              data?.segSocial?.trabalhadorIndependente?.ultimoRendimentoTrimestral || 
                              (data?.at?.regimeSimplificado?.rendimentoServicos ? data.at.regimeSimplificado.rendimentoServicos / 4 * 0.70 : 0);
  
  // Estimate annualized gross based on declared quarter (or input)
  const rawAnnualized = grossIncomeQuarter > 0 ? (grossIncomeQuarter / 0.70) * 4 : (data?.at?.regimeSimplificado?.rendimentoServicos || 0);
  const annualizedGross = Math.round(rawAnnualized * 100) / 100;
  const monthlyAverageGross = Math.round((annualizedGross / 12) * 100) / 100;

  findings.metrics = {
    grossQuarterly: grossIncomeQuarter > 0 ? Math.round((grossIncomeQuarter / 0.70) * 100) / 100 : 0,
    grossAnnualEstimated: annualizedGross,
    monthlyAverageGross,
    currentSSMonthly: data?.segSocial?.trabalhadorIndependente?.mensalidadePrevista || 0,
    currentSSQuarterlyBase: data?.segSocial?.trabalhadorIndependente?.baseIncidenciaMensal || (grossIncomeQuarter > 0 ? Math.round((grossIncomeQuarter / 3) * 100) / 100 : 0)
  };

  // =========================================================================
  // 1. REGIME SIMPLIFICADO & 15% EXPENSE JUSTIFICATION (CIRS Art. 31º n.º 13)
  // =========================================================================
  const coefficient = REGIME_SIMPLIFICADO_COEFFICIENTS.SERVICOS_PROFISSIONAIS_ESPECIFICOS; // 0.75
  const taxableBaseStandard = annualizedGross * coefficient;
  const requiredExpenseJustification = annualizedGross * 0.15; // 15% of gross
  
  // What automatically justifies expenses:
  // a) Specific standard deduction: 4.104 € OR total SS contributions if higher
  const annualSSContributions = findings.metrics.currentSSMonthly * 12;
  const automaticJustification = Math.max(AUTONOMO_CONSTANTS.DEDUCAO_ESPECIFICA_PADRAO, annualSSContributions);
  
  // Despesas adicionais necessárias
  const expenseDeficit = Math.max(0, requiredExpenseJustification - automaticJustification);

  if (expenseDeficit > 0) {
    findings.healthIndex -= 10;
    findings.alerts.push({
      code: 'EXPENSE_DEFICIT_31_13',
      priority: 'HIGH',
      legalReference: 'Artigo 31.º, n.º 13 do CIRS',
      title: `Atenção ao Défice de Justificação de Despesas: Falta ${formatEUR(expenseDeficit)}`,
      summary: `Para evitar que o seu rendimento tributável suba acima dos 75%, tem de justificar 15% da sua faturação bruta (${formatEUR(requiredExpenseJustification)}) com despesas afetas à atividade ou Segurança Social.`,
      solution: `As suas contribuições da SS (${formatEUR(annualSSContributions)}/ano) já cobrem parte. Garanta que todas as faturas de internet, telemóvel, eletricidade (25%), equipamentos informáticos e software são passadas com o seu NIF e associadas à atividade no e-Fatura.`
    });
  }

  // =========================================================================
  // 2. BENEFÍCIO DE INÍCIO DE ATIVIDADE (CIRS Art. 31º n.º 10) - O TRUQUE DO 1º E 2º ANO
  // =========================================================================
  const year1TaxableBaseDiscount = taxableBaseStandard * 0.50; // 50% discount on taxable base in year 1!
  const year2TaxableBaseDiscount = taxableBaseStandard * 0.25; // 25% discount in year 2!

  findings.legalTricksAndProtections.push({
    trickName: 'Benefício Fiscal de Início de Atividade (Art. 31º, n.º 10 CIRS)',
    description: 'No ano de início de atividade e no ano seguinte, o rendimento tributável beneficia de um corte massivo no coeficiente do Regime Simplificado.',
    mechanics: [
      `1.º Ano Fiscal de Atividade: Coeficiente reduzido em 50% (de 0.75 para apenas 0.375!). Poupança estimada de imposto de até ${formatEUR(year1TaxableBaseDiscount * 0.35)}.`,
      `2.º Ano Fiscal de Atividade: Coeficiente reduzido em 25% (de 0.75 para 0.5625!).`,
      'Requisito legal indispensável: Não ter auferido rendimentos da categoria B nos 5 anos anteriores nem estar a prestar serviços à mesma entidade patronal anterior.'
    ],
    expertAdvice: 'Se está nos seus primeiros 2 anos fiscais, certifique-se de que o Anexo B do seu Modelo 3 de IRS assinala corretamente o campo de início de atividade para não pagar imposto a dobrar por esquecimento do sistema.'
  });

  // =========================================================================
  // 3. SEGURANÇA SOCIAL: ESTRATÉGIA DE VARIAÇÃO TRIMESTRAL (-25% vs +25%)
  // =========================================================================
  const currentBase = findings.metrics.currentSSQuarterlyBase;
  const ssMinus25 = {
    base: currentBase * 0.75,
    monthly: (currentBase * 0.75) * AUTONOMO_CONSTANTS.TAXA_SS_TRABALHADOR_INDEPENDENTE,
    annualSavings: ((currentBase * AUTONOMO_CONSTANTS.TAXA_SS_TRABALHADOR_INDEPENDENTE) - ((currentBase * 0.75) * AUTONOMO_CONSTANTS.TAXA_SS_TRABALHADOR_INDEPENDENTE)) * 12
  };
  const ssPlus25 = {
    base: currentBase * 1.25,
    monthly: (currentBase * 1.25) * AUTONOMO_CONSTANTS.TAXA_SS_TRABALHADOR_INDEPENDENTE,
    annualExtraContribution: (((currentBase * 1.25) * AUTONOMO_CONSTANTS.TAXA_SS_TRABALHADOR_INDEPENDENTE) - (currentBase * AUTONOMO_CONSTANTS.TAXA_SS_TRABALHADOR_INDEPENDENTE)) * 12
  };

  findings.optimizationStrategies.push({
    title: 'Engenharia Contributiva: Gestão Estratégica da Variação de Escalão (Art. 163º CRCSPSS)',
    currentMonthly: findings.metrics.currentSSMonthly,
    options: {
      optionDown25: {
        newMonthly: ssMinus25.monthly,
        monthlySaving: findings.metrics.currentSSMonthly - ssMinus25.monthly,
        annualCashflowLiberation: ssMinus25.annualSavings,
        whenToUse: 'Meses de quebra de faturação, necessidade de liquidez imediata para investimento próprio, ou quando a proteção social imediata não é prioridade.'
      },
      optionUp25: {
        newMonthly: ssPlus25.monthly,
        monthlyExtra: ssPlus25.monthly - findings.metrics.currentSSMonthly,
        annualExtra: ssPlus25.annualExtraContribution,
        whenToUse: '1) 6 meses antes de planeada licença de parentalidade (o subsídio de parentalidade paga 100% ou 83% do rendimento de referência!); 2) Para maximizar a dedução de despesas no IRS e abater a matéria coletável de Categoria B.'
      }
    }
  });

  // =========================================================================
  // 4. CLIENTES INTERNACIONAIS, IVA & DECLARAÇÃO RECAPITULATIVA VIES (CIVA Art. 6º)
  // =========================================================================
  findings.internationalVIESCompliance = {
    legalFramework: 'Regras de Localização das Operações (Artigo 6.º, n.º 6, a) do CIVA) & Diretiva 2006/112/CE',
    rules: [
      {
        target: 'Clientes B2B da União Europeia (Empresas com NIF VIES válido)',
        ivaRate: '0% (Isento de IVA em Portugal)',
        mandatoryInvoiceMention: 'Autoliquidação - Artigo 6.º, n.º 6, alínea a) do CIVA (ou "Reverse Charge - Art. 196 of Directive 2006/112/EC")',
        criticalObligation: 'OBRIGATÓRIO submeter a Declaração Recapitulativa de IVA (VIES) no Portal das Finanças até ao dia 20 do mês seguinte (se mensal) ou do trimestre (se trimestral). O não envio gera coima de 50€ a 3.750€.'
      },
      {
        target: 'Clientes Fora da União Europeia (EUA, Reino Unido, Canadá, Suíça, etc.)',
        ivaRate: '0% (Fora do campo de incidência)',
        mandatoryInvoiceMention: 'IVA - Autoliquidação [Regras de Localização - Artigo 6.º, n.º 6, alínea a) do CIVA]',
        criticalObligation: 'Não requer envio de Declaração Recapitulativa VIES, mas deve constar no Campo 8 do Quadro 06 da Declaração Periódica de IVA.'
      },
      {
        target: 'Clientes Nacionais ou Particulares (B2C)',
        ivaRate: '23% (Taxa Normal) — exceto se enquadrado no Artigo 53.º CIVA (faturação total < 15.000€/ano).',
        mandatoryInvoiceMention: 'IVA à taxa legal de 23% liquidado na fatura.',
        criticalObligation: 'Entrega da Declaração Periódica de IVA (mensal ou trimestral) e pagamento da respetiva guia de IVA até ao dia 25 do segundo mês seguinte ao trimestre/mês.'
      }
    ]
  };

  // =========================================================================
  // 5. RETENÇÃO NA FONTE & A ARMADILHA DOS PAGAMENTOS POR CONTA (PPC - Art. 102º CIRS)
  // =========================================================================
  findings.legalTricksAndProtections.push({
    trickName: 'A Armadilha dos Pagamentos por Conta & Provisão de IRS Sem Retenção',
    description: 'Quando presta serviços a entidades estrangeiras ou clientes sem contabilidade organizada, NÃO HÁ RETENÇÃO NA FONTE no momento da faturação.',
    mechanics: [
      `Para uma faturação anual de ${formatEUR(annualizedGross)}, se faturar a clientes estrangeiros com 0% de retenção na fonte, o acerto de contas do IRS em Maio do ano seguinte pode exigir um pagamento único de ${formatEUR(annualizedGross * 0.75 * 0.32)} a ${formatEUR(annualizedGross * 0.75 * 0.42)}.`,
      'No ano seguinte à liquidação do IRS sem retenção na fonte, a AT emite automaticamente 3 guias de Pagamentos por Conta (PPC) em Julho, Setembro e Dezembro (Art. 102.º CIRS).',
      'Regra de Ouro do Advogado: Crie uma conta poupança separada e transfira 25% a 30% de CADA fatura recebida logo no próprio dia para nunca sofrer constrangimentos de tesouraria.'
    ],
    expertAdvice: 'Se a sua faturação descer subitamente no ano seguinte, pode legalmente limitar ou suspender o 3.º Pagamento por Conta (Dezembro) ao abrigo do Art. 102.º n.º 7 do CIRS, caso comprove que o imposto retido e os PPC já pagos cobrem o imposto total previsto.'
  });

  // =========================================================================
  // 6. SIMULADOR DE TRANSIÇÃO: RECIBOS VERDES vs SOCIEDADE UNIPESSOAL (QUANDO MUDAR?)
  // =========================================================================
  const annualGross = annualizedGross;
  const irsEffectiveTax = 0.35; // Estimated marginal/effective tax rate for mid-high income in IRS
  const estimatedPersonalIRSandSS = (annualGross * 0.75 * irsEffectiveTax) + annualSSContributions;
  
  // In a Company (Unipessoal por Quotas):
  // You pay yourself a reasonable salary (e.g. 1.200€ to 1.500€/month), deduct company expenses, and the rest is taxed in IRC at 17% (PME rate up to 50k)
  const proposedDirectorSalary = 1350.00 * 14; // 18.900 € / year
  const companyDeductibleExpenses = Math.max(6000, annualGross * 0.12); // Accounting, software, telecom, office, car amortizations
  const mealAllowanceCard = AUTONOMO_CONSTANTS.SUBSIDIO_ALIMENTACAO_ISENTO_CARTAO * 22 * 11; // 2.323,20 € net tax-free per year!
  
  const taxableProfitIRC = Math.max(0, annualGross - proposedDirectorSalary - companyDeductibleExpenses - mealAllowanceCard);
  const ircTax = Math.min(50000, taxableProfitIRC) * AUTONOMO_CONSTANTS.TAXA_IRC_PME_REDUZIDA + Math.max(0, taxableProfitIRC - 50000) * AUTONOMO_CONSTANTS.TAXA_IRC_NORMAL;
  
  const companyTotalTaxEstimate = ircTax + (proposedDirectorSalary * 0.15) + (proposedDirectorSalary * 0.3475) + 1800; // IRC + Director IRS + TSU (23.75% + 11%) + Accounting fees (150€/mo)
  const netEstimatedAdvantage = estimatedPersonalIRSandSS - companyTotalTaxEstimate;

  findings.companyTransitionAnalysis = {
    annualGrossIncome: annualGross,
    recibosVerdesTotalTaxAndSS: estimatedPersonalIRSandSS,
    companyTotalEstimatedCost: companyTotalTaxEstimate,
    annualEstimatedAdvantage: netEstimatedAdvantage,
    recommendedStructure: annualGross > 50000 ? 'Sociedade Unipessoal por Quotas (Vantagem Clara de Otimização)' : 'Manter Trabalhador Independente (Regime Simplificado)',
    keyAdvantagesOfCompany: [
      'IRC a 17% (taxa reduzida de PME) até 50.000€ de matéria coletável vs IRS que atinge taxas de 45% a 48% + taxas de solidariedade.',
      `Subsídio de Alimentação em Cartão: ${formatEUR(mealAllowanceCard)} por ano 100% isento de IRS e de Segurança Social.`,
      'Viatura 100% Elétrica da Empresa: Dedução de 100% do IVA do carro (até 62.500€), 0% de tributação autónoma e custos de carregamento 100% dedutíveis.',
      'Possibilidade de acumular e reinvestir lucros na empresa sem serem tributados na esfera pessoal até à distribuição de dividendos (tributados a taxa liberatória de 28% ou englobados com 50% de isenção).',
      'Proteção total do património pessoal: a responsabilidade pelas dívidas é limitada ao capital social da quota (mínimo legal de 1€).'
    ]
  };

  // =========================================================================
  // 7. HABITAÇÃO PRÓPRIA/ARRENDADA: DEDUÇÃO DE 25% DAS DESPESAS DA CASA
  // =========================================================================
  findings.legalTricksAndProtections.push({
    trickName: 'Dedução de 25% das Despesas de Casa (Home Office / CIRS Art. 31º n.º 13 d))',
    description: 'Se tem a sede fiscal da sua atividade registada na sua morada de habitação e não dispõe de escritório exterior dedicado:',
    mechanics: [
      'A lei permite afetar 25% de todas as despesas da habitação (renda da casa, faturas de eletricidade, água, gás, internet fixa e condomínio) como despesa profissional da atividade.',
      'Estas despesas entram diretamente no apuramento do limiar dos 15% de despesas obrigatórias do Regime Simplificado.',
      'Procedimento prático: Pedir faturas de eletricidade e telecomunicações com o seu NIF e registar no e-Fatura na proporção de 25% afeta à atividade.'
    ],
    expertAdvice: 'Evita a tributação acrescida no IRS do Regime Simplificado sem necessidade de custos operacionais adicionais.'
  });

  return findings;
}

export function formatEUR(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
