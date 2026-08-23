import test from 'node:test';
import assert from 'node:assert/strict';
import { runAdvisorAnalysis, DEDUCTION_CAPS, DEADLINES_CALENDAR, formatCurrency } from '../cli/advisor.js';
import { analyzeAutonomoProfile, AUTONOMO_CONSTANTS } from '../cli/autonomo-advisor.js';

test('Deduction caps and legal references are valid', () => {
  assert.equal(DEDUCTION_CAPS.despesasGerais.maxSingle, 250);
  assert.equal(DEDUCTION_CAPS.saude.max, 1000);
  assert.equal(DEDUCTION_CAPS.educacao.max, 800);
  assert.equal(DEDUCTION_CAPS.habitacao.maxRent, 600);
  assert.equal(DEDUCTION_CAPS.ivaBeneficio.max, 250);
  assert.equal(DEDUCTION_CAPS.ppr.maxUnder35, 400);
});

test('Deadlines calendar includes key AT, SS, and PPC dates', () => {
  assert.ok(DEADLINES_CALENDAR.length >= 10);
  const ppcEntries = DEADLINES_CALENDAR.filter(d => d.title.includes('PPC') || d.title.includes('Pagamento por Conta'));
  assert.ok(ppcEntries.length >= 3, 'Should contain all 3 PPC instalments');
});

test('runAdvisorAnalysis calculates health score and detects debts', () => {
  const sampleData = {
    at: {
      situacaoFiscal: 'Com Dívida / Não Regularizada',
      dividas: { total: 450.50, processos: [{ amount: 450.50, description: 'Coima Iva' }] }
    },
    segSocial: {
      situacaoContributiva: 'Regularizada',
      dividas: { total: 0 }
    },
    efatura: {
      faturasPendentes: 3,
      categorias: { saude: 150, despesasGerais: 200 }
    }
  };

  const report = runAdvisorAnalysis(sampleData);
  assert.equal(report.taxSummary.fiscalStatus, 'Com Dívida / Não Regularizada');
  assert.equal(report.taxSummary.totalDebts, 450.50);
  assert.equal(report.taxSummary.pendingInvoicesCount, 3);
  assert.ok(report.taxSummary.healthScore < 100);
  assert.ok(report.alerts.some(a => a.level === 'CRITICAL'));
});

test('analyzeAutonomoProfile calculates Regime Simplificado & SS options', () => {
  const data = {
    segSocial: {
      trabalhadorIndependente: {
        rendimentoRelevanteTrimestral: 10500, // 15.000 gross per quarter
        baseIncidenciaMensal: 3500,
        mensalidadePrevista: 749
      }
    }
  };

  const result = analyzeAutonomoProfile(data);
  assert.equal(result.metrics.grossAnnualEstimated, 60000);
  assert.ok(result.optimizationStrategies.length > 0);
  assert.ok(result.companyTransitionAnalysis);
});

test('Currency formatter outputs Portuguese standard', () => {
  const formatted = formatCurrency(1250.50);
  assert.ok(formatted.includes('1.250,50') || formatted.includes('1250,50') || formatted.includes('1 250,50'));
  assert.ok(formatted.includes('€'));
});
