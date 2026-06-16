import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, emailHmac } from './encryption';

describe('encryption (AES-256-GCM)', () => {
  it('faz round-trip de texto (inclui acentos/emoji)', () => {
    const plaintext = 'Olá, mundo! 💸 informação sensível';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('usa IV aleatório — mesma entrada gera ciphertexts diferentes', () => {
    expect(encrypt('repetido')).not.toBe(encrypt('repetido'));
  });

  it('detecta adulteração via auth tag (GCM)', () => {
    const cipher = encrypt('segredo');
    const buf = Buffer.from(cipher, 'base64');
    buf[buf.length - 1] ^= 0xff; // corrompe um byte do ciphertext
    expect(() => decrypt(buf.toString('base64'))).toThrow();
  });

  it('rejeita ciphertext curto demais', () => {
    expect(() => decrypt('AAAA')).toThrow();
  });

  it('decrypt(null) retorna null (campo opcional)', () => {
    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeNull();
  });
});

describe('emailHmac', () => {
  it('é determinístico e normaliza caixa/espaços', () => {
    expect(emailHmac('  User@Example.COM ')).toBe(emailHmac('user@example.com'));
  });

  it('difere para e-mails diferentes', () => {
    expect(emailHmac('a@x.com')).not.toBe(emailHmac('b@x.com'));
  });
});
