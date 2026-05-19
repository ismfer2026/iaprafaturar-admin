import { describe, it, expect } from 'vitest';

// Testes básicos de importação para verificar se os componentes compilam sem erros
describe('Components', () => {
  it('Header deve existir', async () => {
    const Header = (await import('@/components/Header')).Header;
    expect(Header).toBeDefined();
  });

  it('Sidebar deve existir', async () => {
    const Sidebar = (await import('@/components/Sidebar')).Sidebar;
    expect(Sidebar).toBeDefined();
  });

  it('Layout deve existir', async () => {
    const Layout = (await import('@/components/Layout')).Layout;
    expect(Layout).toBeDefined();
  });
});
