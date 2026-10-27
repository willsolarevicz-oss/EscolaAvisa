import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseJwtExpiresIn, parseTrustProxy } from '../src/config/env.js';

describe('parseJwtExpiresIn', () => {
  it('usa 8h quando não informado', () => {
    assert.equal(parseJwtExpiresIn(undefined), '8h');
    assert.equal(parseJwtExpiresIn('  '), '8h');
  });

  it('aceita número + unidade', () => {
    for (const value of ['30s', '15m', '8h', '1d']) {
      assert.equal(parseJwtExpiresIn(value), value);
    }
  });

  it('recusa número sem unidade (seria lido como milissegundos)', () => {
    assert.throws(() => parseJwtExpiresIn('28800'), /JWT_EXPIRES_IN inválido/);
  });

  it('recusa formatos inválidos', () => {
    for (const value of ['8 horas', '0h', '-1h', '8x', 'h']) {
      assert.throws(() => parseJwtExpiresIn(value), /JWT_EXPIRES_IN inválido/, value);
    }
  });
});

describe('parseTrustProxy', () => {
  it('é false por padrão', () => {
    assert.equal(parseTrustProxy(undefined), false);
    assert.equal(parseTrustProxy(''), false);
    assert.equal(parseTrustProxy('false'), false);
    assert.equal(parseTrustProxy('0'), false);
  });

  it('aceita número de proxies e lista de IPs', () => {
    assert.equal(parseTrustProxy('1'), 1);
    assert.equal(parseTrustProxy('loopback, 10.0.0.0/8'), 'loopback, 10.0.0.0/8');
  });

  it('recusa "true" por ser inseguro', () => {
    assert.throws(() => parseTrustProxy('true'), /inseguro/);
  });
});
