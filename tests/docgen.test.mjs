import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import {
  DEFAULT_COMPANY_PROFILE,
  resolveProfile,
  generateMapaKmHtml,
  generateAtaRemuneracaoHtml,
  generateDeclaracaoAimaHtml,
  generateOficioSefHtml
} from '../document_generator.mjs';

test('resolveProfile applies defaults and allows custom overrides', () => {
  const defaultP = resolveProfile();
  assert.equal(defaultP.name, 'ALLNOACROBÁTICO LDA');
  assert.equal(defaultP.nipc, '517551624');

  const customP = resolveProfile({ name: 'TECH INNOVATIONS LDA', nipc: '599999999' });
  assert.equal(customP.name, 'TECH INNOVATIONS LDA');
  assert.equal(customP.nipc, '599999999');
  assert.equal(customP.capitalSocial, '1.000,00 €'); // Fallback to default
});

test('generateMapaKmHtml produces valid HTML and calculation', () => {
  const result = generateMapaKmHtml(2026, 8, 1000);
  assert.equal(result.totalAmount, 400.00); // 1000 * 0.40
  assert.ok(fs.existsSync(result.filePath));

  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.ok(content.includes('MAPA MENSAL DE AJUDAS DE CUSTO'));
  assert.ok(content.includes('400,00 €'));
  assert.ok(content.includes('Decreto-Lei n.º 106/98'));
});

test('generateAtaRemuneracaoHtml creates compliant corporate minutes', () => {
  const result = generateAtaRemuneracaoHtml();
  assert.ok(fs.existsSync(result.filePath));
  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.ok(content.includes('ATA NÚMERO DOIS'));
  assert.ok(content.includes('Vencimento Base de Gerência'));
  assert.ok(content.includes('10,20 € por dia útil'));
});

test('generateDeclaracaoAimaHtml creates formal subsistence certificate', () => {
  const result = generateDeclaracaoAimaHtml();
  assert.ok(fs.existsSync(result.filePath));
  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.ok(content.includes('DECLARAÇÃO DE RENDIMENTOS E MEIOS DE SUBSISTÊNCIA'));
  assert.ok(content.includes('LEI N.º 23/2007'));
  assert.ok(content.includes('1.414,40 €'));
});

test('generateOficioSefHtml creates formal tax execution request', () => {
  const result = generateOficioSefHtml();
  assert.ok(fs.existsSync(result.filePath));
  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.ok(content.includes('PEDIDO DE EMISSÃO DE CERTIDÃO DE EXTINÇÃO'));
  assert.ok(content.includes('1102202500815756'));
});
