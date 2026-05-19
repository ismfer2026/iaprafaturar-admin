import { describe, it, expect } from 'vitest';
import { isValidEmail, isStrongPassword } from '@/lib/auth';

describe('Authentication utilities', () => {
  describe('isValidEmail', () => {
    it('deve aceitar email válido', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('deve rejeitar email sem @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('deve rejeitar email vazio', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('deve rejeitar email com espaços', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('deve aceitar senha forte', () => {
      expect(isStrongPassword('SeN@Forte123')).toBe(true);
    });

    it('deve rejeitar senha fraca (apenas letras)', () => {
      expect(isStrongPassword('senha')).toBe(false);
    });

    it('deve rejeitar senha muito curta', () => {
      expect(isStrongPassword('S@1')).toBe(false);
    });

    it('deve rejeitar senha sem números', () => {
      expect(isStrongPassword('SenhaForte@')).toBe(false);
    });

    it('deve rejeitar senha vazia', () => {
      expect(isStrongPassword('')).toBe(false);
    });
  });
});
