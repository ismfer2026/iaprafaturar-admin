import { describe, it, expect } from 'vitest';
import { ptBR } from '@/i18n/locales/pt-BR';
import { enUS } from '@/i18n/locales/en-US';
import { esAL } from '@/i18n/locales/es-AL';

describe('i18n dictionaries', () => {
  it('deve ter dicionário pt-BR', () => {
    expect(ptBR).toBeDefined();
    expect(typeof ptBR).toBe('object');
  });

  it('deve ter dicionário en-US', () => {
    expect(enUS).toBeDefined();
    expect(typeof enUS).toBe('object');
  });

  it('deve ter dicionário es-AL', () => {
    expect(esAL).toBeDefined();
    expect(typeof esAL).toBe('object');
  });

  it('pt-BR deve ter seções principais', () => {
    expect(ptBR.common).toBeDefined();
    expect(ptBR.navigation).toBeDefined();
  });

  it('all dictionaries should have same structure', () => {
    const ptKeys = Object.keys(ptBR).sort();
    const enKeys = Object.keys(enUS).sort();
    const esKeys = Object.keys(esAL).sort();

    expect(ptKeys.length).toBe(enKeys.length);
    expect(ptKeys.length).toBe(esKeys.length);
  });
});
