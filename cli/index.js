#!/usr/bin/env node

/**
 * Personal AT & Segurança Social Advisor — CLI Runner (A+ Lawyer & Autónomo Edition)
 * 
 * Usage:
 *   node cli/index.js --sample
 *   node cli/index.js --cookies <path_to_cookies.json_or_netscape.txt>
 *   node cli/index.js --snapshot <path_to_snapshot.json>
 */

import fs from 'fs';
import path from 'path';
import { runAdvisorAnalysis, formatCurrency } from './advisor.js';
import { parseCookieFile, fetchPortalDataWithCookies } from './fetcher.js';
import { formatEUR } from './autonomo-advisor.js';

async function main() {
  const args = process.argv.slice(2);

  console.log('\n========================================================================');
  console.log('🛡️  PERSONAL AT & SEGURANÇA SOCIAL ADVISOR — ADVANCED AUTÓNOMO EDITION');
  console.log('========================================================================\n');

  let rawData = null;

  const isSample = args.includes('--sample') || args.includes('--demo');
  const cookieIndex = args.indexOf('--cookies');
  const snapshotIndex = args.indexOf('--snapshot');

  if (isSample) {
    const samplePath = path.resolve(process.cwd(), 'data/sample_snapshot.json');
    console.log(`💡 Modo de Demonstração / Dados Genéricos de Exemplo (${samplePath})`);
    rawData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
  } else if (cookieIndex !== -1 && args[cookieIndex + 1]) {
    const cookiePath = path.resolve(process.cwd(), args[cookieIndex + 1]);
    console.log(`📂 Carregando ficheiro de cookies: ${cookiePath}`);
    const cookies = parseCookieFile(cookiePath);
    rawData = await fetchPortalDataWithCookies(cookies);
  } else if (snapshotIndex !== -1 && args[snapshotIndex + 1]) {
    const snapPath = path.resolve(process.cwd(), args[snapshotIndex + 1]);
    console.log(`📂 Carregando snapshot JSON: ${snapPath}`);
    rawData = JSON.parse(fs.readFileSync(snapPath, 'utf-8'));
  } else {
    // Default: load real crawled user snapshot
    const crawledSnap = path.resolve(process.cwd(), 'crawled_data/seg_social/seg_social_unified_snapshot.json');
    if (fs.existsSync(crawledSnap)) {
      console.log(`📂 A utilizar os seus dados reais recolhidos (${crawledSnap})`);
      const cookies = fs.existsSync('ss_cookies.txt') ? parseCookieFile('ss_cookies.txt') : [];
      rawData = await fetchPortalDataWithCookies(cookies);
    } else {
      console.log('⚠️ Nenhum snapshot local encontrado. A inicializar com dados reais vazios.');
      const cookies = fs.existsSync('ss_cookies.txt') ? parseCookieFile('ss_cookies.txt') : [];
      rawData = await fetchPortalDataWithCookies(cookies);
    }
  }

  // Execute Advisor Analysis
  const report = runAdvisorAnalysis(rawData);
  const auto = report.autonomoAnalysis;

  // Print Summary Table
  console.log('\n📊 RESUMO GERAL DE SAÚDE FISCAL & SEGURANÇA SOCIAL:');
  console.log('------------------------------------------------------------------------');
  console.log(`Índice de Saúde Fiscal:     ${report.taxSummary.healthScore}/100`);
  console.log(`Situação Fiscal (AT):       ${report.taxSummary.fiscalStatus}`);
  console.log(`Situação Contributiva (SS): ${report.taxSummary.ssStatus}`);
  console.log(`Dívida Total Consolidada:   ${formatCurrency(report.taxSummary.totalDebts)}`);
  console.log(`Faturação Bruta Anual Est.: ${formatEUR(auto.metrics.grossAnnualEstimated)}`);
  console.log(`Mensalidade SS Atual:       ${formatEUR(auto.metrics.currentSSMonthly)}/mês`);
  console.log(`Deduções IRS Acumuladas:    ${formatCurrency(report.taxSummary.totalDeductionsAccumulated)}`);
  console.log(`Margem Deduções Pessoais:   ${formatCurrency(report.taxSummary.potentialDeductionsRemaining)}`);
  console.log('------------------------------------------------------------------------\n');

  // Print Alerts
  if (report.alerts.length > 0) {
    console.log('⚠️  ALERTAS DE CUMPRIMENTO & AÇÃO IMEDIATA:');
    report.alerts.forEach((a, i) => {
      console.log(`\n[${i + 1}] ${a.title} (${a.source})`);
      console.log(`    Descrição: ${a.description}`);
      console.log(`    👉 Ação:   ${a.action}`);
    });
    console.log('\n------------------------------------------------------------------------\n');
  }

  // Print Autonomous Specialist Section: Legal Tricks & Rules
  console.log('⚖️  DIAGNOSTICO JURÍDICO & FISCAL DO TRABALHADOR INDEPENDENTE (A+):');
  console.log('------------------------------------------------------------------------');
  auto.legalTricksAndProtections.forEach((trick, i) => {
    console.log(`\n[${i + 1}] 🌟 ${trick.trickName}`);
    console.log(`    Detalhe: ${trick.description}`);
    trick.mechanics.forEach(m => console.log(`    • ${m}`));
    console.log(`    💡 Conselho de Advogado: ${trick.expertAdvice}`);
  });

  // International Compliance
  console.log('\n🌍 REGRAS DE IVA & CLIENTES INTERNACIONAIS (CIVA Art. 6º & VIES):');
  console.log('------------------------------------------------------------------------');
  auto.internationalVIESCompliance.rules.forEach((rule, i) => {
    console.log(`\n[${i + 1}] ${rule.target}`);
    console.log(`    Taxa de IVA: ${rule.ivaRate}`);
    console.log(`    Menção Obrigatória na Fatura: "${rule.mandatoryInvoiceMention}"`);
    console.log(`    ⚠️  Obrigação Declarativa: ${rule.criticalObligation}`);
  });

  // Company Transition Simulator
  console.log('\n🏢 SIMULADOR DE TRANSIÇÃO: RECIBOS VERDES vs EMPRESA UNIPESSOAL:');
  console.log('------------------------------------------------------------------------');
  const comp = auto.companyTransitionAnalysis;
  console.log(`Faturação Bruta Anual:            ${formatEUR(comp.annualGrossIncome)}`);
  console.log(`Custo Total IRS + SS (Autónomo):  ${formatEUR(comp.recibosVerdesTotalTaxAndSS)} / ano`);
  console.log(`Custo Total em Empresa (IRC+TSU): ${formatEUR(comp.companyTotalEstimatedCost)} / ano`);
  console.log(`Vantagem Anual Líquida Estimada:  ${formatEUR(comp.annualEstimatedAdvantage)} / ano`);
  console.log(`👉 Recomendação:                  ${comp.recommendedStructure}`);
  console.log('\nPrincipais Vantagens de Empresa:');
  comp.keyAdvantagesOfCompany.forEach(adv => console.log(`  ✓ ${adv}`));

  console.log('\n========================================================================');
  console.log('✅ Análise Jurídico-Fiscal concluída.');
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('\n❌ Erro na execução:', err.message);
  process.exit(1);
});
