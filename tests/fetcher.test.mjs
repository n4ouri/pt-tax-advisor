import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCookieString, buildCookieHeader, isInvalidErrorResponse } from '../cli/fetcher.js';

test('parseCookieString parses JSON cookie arrays and objects', () => {
  const jsonArr = JSON.stringify([{ name: 'JSESSIONID', value: '123456', domain: 'seg-social.pt' }]);
  const parsed1 = parseCookieString(jsonArr);
  assert.equal(parsed1.length, 1);
  assert.equal(parsed1[0].name, 'JSESSIONID');
  assert.equal(parsed1[0].value, '123456');

  const jsonObj = JSON.stringify({ token: 'abcdef', user: 'naouri' });
  const parsed2 = parseCookieString(jsonObj);
  assert.equal(parsed2.length, 2);
});

test('parseCookieString parses Netscape/cURL tab-delimited cookies', () => {
  const netscape = `.seg-social.pt\tTRUE\t/\tTRUE\t1799999999\tSSO_TOKEN\tsecret_val\n.financas.gov.pt\tTRUE\t/\tTRUE\t1799999999\tPF_TOKEN\tfin_val`;
  const parsed = parseCookieString(netscape);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'SSO_TOKEN');
  assert.equal(parsed[0].value, 'secret_val');
});

test('buildCookieHeader filters by domain correctly', () => {
  const cookies = [
    { name: 'c1', value: 'v1', domain: 'seg-social.pt' },
    { name: 'c2', value: 'v2', domain: 'portaldasfinancas.gov.pt' }
  ];

  const ssHeader = buildCookieHeader(cookies, 'seg-social.pt');
  assert.equal(ssHeader, 'c1=v1');

  const atHeader = buildCookieHeader(cookies, 'financas.gov.pt');
  assert.equal(atHeader, 'c2=v2');
});

test('isInvalidErrorResponse identifies 202 error pages and expired sessions', () => {
  assert.equal(isInvalidErrorResponse('<html><title>Aplicação Inexistente</title><body>ADC O pedido é inválido.</body></html>'), true);
  assert.equal(isInvalidErrorResponse('Sessão expirada por inatividade'), true);
  assert.equal(isInvalidErrorResponse(''), true);
  assert.equal(isInvalidErrorResponse(JSON.stringify({ status: 'ok', data: [1, 2, 3] })), false);
});
