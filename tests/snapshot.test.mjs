import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidContent, generateSnapshot } from '../generate_snapshot.mjs';

test('isValidContent correctly rejects error pages and login screens', () => {
  assert.equal(isValidContent(''), false);
  assert.equal(isValidContent('short text'), false);
  assert.equal(isValidContent('<html><head><title>Aplicação Inexistente</title></head><body>ADC O pedido é inválido.</body></html>'), false);
  assert.equal(isValidContent('<html><body>Serviço de Autenticação da Segurança Social - Iniciar Sessão</body></html>'), false);
  assert.equal(isValidContent('<html><body>Sessão expirada. Por favor autentique-se novamente.</body></html>'), false);
});

test('isValidContent accepts valid authenticated content', () => {
  const validJson = JSON.stringify({ niss: '12168017918', nome: 'ABDELRHAFAR NAOURI', estado: 'ATIVO' });
  assert.equal(isValidContent(validJson), true);
  
  const validHtml = '<div class="PTSS-container"><h1>Situação Contributiva Regularizada</h1></div>';
  assert.equal(isValidContent(validHtml), true);
});

test('generateSnapshot returns a complete snapshot object', () => {
  const snap = generateSnapshot();
  assert.ok(snap);
  assert.ok(snap.extractedAt);
  assert.ok(typeof snap.profile === 'object');
  assert.ok(typeof snap.situacaoContributiva === 'object');
});
