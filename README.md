# 🎛️ iaprafaturar Admin Panel

Painel administrativo completo da plataforma **iaprafaturar** - gerenciamento de profissionais, campanhas, planos, agentes IA e muito mais.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](.)
[![Node Version](https://img.shields.io/badge/node-18%2B-blue)](.)
[![Languages](https://img.shields.io/badge/languages-3-success)](.)
[![License](https://img.shields.io/badge/license-Proprietary-red)](.)

---

## ✨ Funcionalidades Principais

- 📊 **Dashboard** - Visão geral com KPIs financeiros e métricas em tempo real
- 👥 **Profissionais** - Gestão completa de contas com perfis detalhados
- 💳 **Planos** - Configuração de assinaturas e análise de churn
- 🤝 **Embaixadores** - Programa de indicações com ranking
- 🤖 **Agentes IA** - Configuração de 5 tipos de agentes inteligentes
- 📢 **Campanhas** - 13 templates pré-prontos em 5 categorias
- 📬 **Notificações** - Broadcasts customizáveis aos profissionais
- 📈 **Métricas** - Análises detalhadas de crescimento e engajamento
- ⚙️ **Configurações** - Gerenciamento global da plataforma
- 🎯 **Nexus** - Console de administração com chat IA

---

## 🌍 Internacionalização Trilíngue

✅ **Português Brasileiro** (pt-BR) - Padrão  
✅ **Inglês Americano** (en-US)  
✅ **Espanhol Argentino** (es-AL)

Mude de idioma a qualquer momento no header da página.

---

## 🚀 Quick Start

### Instalação

```bash
# Clone e instale
git clone <repo>
cd iaprafaturar-admin
npm install
```

### Desenvolvimento

```bash
# Inicie o servidor (http://localhost:5173)
npm run dev

# Execute em background
npm run dev &
```

### Build para Produção

```bash
# Build otimizado
npm run build

# Preview local
npm run preview

# Scan de strings não traduzidas
npm run i18n:scan
```

---

## 🏗️ Arquitetura

### Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** CSS-in-JS (inline styles) + Lucide Icons
- **Backend:** Supabase (Auth + Database)
- **Gráficos:** Recharts
- **Notificações:** Sonner (Toast)

### Estrutura

```
src/
├── pages/          # 11 páginas principais
├── components/     # Componentes reutilizáveis
├── contexts/       # Context API (Auth, Theme)
├── i18n/           # Sistema multilíngue
├── lib/            # Utilities (Supabase, Auth)
└── App.tsx         # Root component
```

---

## 🔐 Autenticação

### Fluxo

1. Login com credenciais de master admin
2. Validação via Supabase Auth
3. Verificação de role admin no banco
4. Acesso ao painel protegido

### Configuração

Crie `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

---

## 📖 Documentação

- **[ONBOARDING.md](./ONBOARDING.md)** - Guia completo para novos desenvolvedores
- **[CHANGELOG.md](./CHANGELOG.md)** - Histórico de versões
- Outros `.md` - Documentação técnica específica

---

## 🧪 Qualidade de Código

- ✅ TypeScript strict mode
- ✅ Zero TODOs no código
- ✅ Build sem erros
- ✅ i18n 99% coberta
- ✅ Componentes bem estruturados

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Páginas | 11 |
| Componentes | 20+ |
| Idiomas | 3 |
| Linhas de código | ~15.000 |
| Bundle (gzip) | 337 KB |
| Build time | ~8s |

---

## 🎯 Roadmap

- [ ] Testes unitários (unit tests)
- [ ] Testes E2E
- [ ] GraphQL (opcional)
- [ ] Real-time updates via WebSockets
- [ ] Dark mode nativo
- [ ] PWA capabilities

---

## 🤝 Contribuindo

1. Crie uma branch (`git checkout -b feature/sua-feature`)
2. Commit com mensagem clara (`git commit -am 'Adiciona feature'`)
3. Push para a branch (`git push origin feature/sua-feature`)
4. Abra um Pull Request

---

## 📝 Padrões de Código

### Nomenclatura

- Componentes: PascalCase (`Dashboard.tsx`)
- Funções: camelCase (`fetchLeads()`)
- Constantes: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Chaves i18n: snake.case.nested (`campaigns.modal_name`)

### TypeScript

- Sempre tipado
- Sem `any`
- Interfaces para dados do backend
- Validação em tempo de compile

### Componentes

```tsx
import { useI18n } from '@/i18n'

export function MyComponent() {
  const { t } = useI18n()
  
  return <div>{t('chave.traduzida')}</div>
}
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Build lento | `rm -rf node_modules dist && npm install` |
| Erro de Auth | Validar `.env.local` e credenciais Supabase |
| Idioma não muda | Limpar localStorage (`iap_locale`) |
| i18n warning | Executar `npm run i18n:scan` |

---

## 📞 Suporte

- 📧 Email: dev@iaprafaturar.com
- 💬 Slack: #admin-panel
- 🐛 Issues: GitHub Issues

---

## 📄 Licença

Proprietary - iaprafaturar © 2026

---

**Versão:** 1.0.0  
**Status:** ✅ Production Ready  
**Última atualização:** Maio 2026
