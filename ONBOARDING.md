# 🎯 Guia de Onboarding - iaprafaturar Admin Panel

Bem-vindo ao painel administrativo da plataforma iaprafaturar! Este documento fornece tudo o que você precisa para começar.

---

## 📋 Índice

1. [Quick Start](#quick-start)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Sistema de Autenticação](#sistema-de-autenticação)
4. [Internacionalização (i18n)](#internacionalização-i18n)
5. [Páginas e Funcionalidades](#páginas-e-funcionalidades)
6. [Desenvolvimento](#desenvolvimento)
7. [Build e Deploy](#build-e-deploy)

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm 9+
- Conta Supabase configurada
- Variáveis de ambiente (.env.local)

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar testes de i18n
npm run i18n:scan
```

Acesse `http://localhost:5173` no navegador.

---

## 📁 Estrutura do Projeto

```
src/
├── pages/              # Páginas principais do painel
│   ├── Dashboard.tsx   # Visão geral com KPIs
│   ├── Professionals.tsx
│   ├── Plans.tsx       # Gestão de planos
│   ├── Ambassadors.tsx # Programa de embaixadores
│   ├── Agents.tsx      # Agentes de IA
│   ├── Campaigns.tsx   # Campanhas de marketing
│   ├── Metrics.tsx     # Análises e métricas
│   ├── Notifications.tsx
│   ├── Settings.tsx    # Configurações globais
│   ├── Nexus.tsx       # Admin Orchestrator
│   └── Login.tsx       # Autenticação
├── components/
│   ├── Header.tsx      # Topo com seletor de idioma
│   ├── Sidebar.tsx     # Menu de navegação
│   ├── Layout.tsx      # Layout principal
│   ├── ProtectedRoute.tsx
│   └── onboarding/     # Componentes de onboarding
├── contexts/
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── AuthContextType.ts
├── lib/
│   ├── supabase.ts     # Cliente Supabase
│   └── auth.ts         # Lógica de autenticação
├── i18n/               # Sistema multilíngue
│   ├── index.ts        # Provider e hook
│   ├── types.ts        # Tipos e interfaces
│   ├── dictionaries.ts # Registro de locales
│   └── locales/        # Dicionários por idioma
│       ├── pt-BR.ts
│       ├── en-US.ts
│       └── es-AL.ts
└── App.tsx             # Componente raiz
```

---

## 🔐 Sistema de Autenticação

### Fluxo

1. **Login** (`/login`) - Credenciais de master admin
2. **Validação** - Supabase Auth + verificação de role admin
3. **Proteção** - `ProtectedRoute` bloqueia acesso não autorizado
4. **Logout** - Confirmação + limpeza de sessão

### Credenciais de Teste

- Email: `admin@iaprafaturar.com`
- Senha: Fornecida em variáveis de ambiente

### Variáveis de Ambiente

Crie `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

---

## 🌍 Internacionalização (i18n)

### Idiomas Suportados

- 🇧🇷 **Português Brasileiro** (`pt-BR`) - Padrão
- 🇺🇸 **Inglês Americano** (`en-US`)
- 🇦🇷 **Espanhol Argentino** (`es-AL`)

### Usando Traduções

No React:

```tsx
import { useI18n } from '@/i18n'

export function MyComponent() {
  const { t, locale, setLocale } = useI18n()
  
  return (
    <div>
      {t('campaigns.title')}
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        {localeOptions.map(opt => (
          <option key={opt.locale} value={opt.locale}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

### Estrutura de Chaves

Chaves seguem padrão de ponto:

```
campaigns.title → "Campanhas"
campaigns.filter_all_categories → "Todas as categorias"
errors.invalid_credentials → "Credenciais inválidas..."
```

### Adicionando Novas Chaves

1. Adicione a chave em `src/i18n/locales/pt-BR.ts`
2. Adicione versões em `en-US.ts` e `es-AL.ts`
3. Use no componente: `t('sua.chave')`
4. Execute `npm run i18n:scan` para validar

---

## 📄 Páginas e Funcionalidades

### Dashboard
**Rota:** `/dashboard`

Visão geral da plataforma com:
- KPIs financeiros (MRR, ARR, etc)
- Assinantes ativos por plano
- Consumo de créditos IA
- Profissionais recentes

### Profissionais
**Rota:** `/profissionais`

Gerencie todas as contas profissionais:
- Filtros por plano e status
- Busca por nome/email
- Perfil detalhado
- Dados financeiros e assinatura

### Planos
**Rota:** `/planos`

Configure planos de assinatura:
- Visão geral de assinantes
- Preços e features
- Calculadora financeira
- Análise de churn

### Embaixadores
**Rota:** `/embaixadores`

Programa de indicações:
- Ranking de embaixadores
- KPIs por embaixador
- Gerenciar incentivos
- Histórico de indicações

### Agentes IA
**Rota:** `/agentes`

Configure agentes de IA:
- 5 tipos de agentes (Agendamento, Lembretes, etc)
- Prompts customizáveis
- Ativar/desativar por profissional
- Histórico de conversas

### Campanhas
**Rota:** `/campanhas`

Crie e gerencie campanhas:
- 5 categorias de campanha
- 13 templates pré-prontos
- Agendamento (imediato, data, gatilho)
- Análise de performance

### Notificações
**Rota:** `/notificacoes`

Envie broadcasts aos profissionais:
- Tipos: Info, Alerta, Atenção, Novidade, Atualização
- Público-alvo customizável
- Histórico de envios
- Taxa de leitura

### Métricas
**Rota:** `/metricas`

Análises detalhadas:
- Crescimento e financeiro
- Engajamento e retenção
- Performance de agentes IA
- Saúde dos usuários (score)

### Configurações
**Rota:** `/configuracoes`

Configurações globais:
- Evolução do histórico
- Alteração de senha
- Preferências da plataforma

### Nexus (Admin Orchestrator)
**Rota:** `/nexus`

Console de administração com:
- Chat com Nexus (IA)
- Gestão de leads
- Status do sistema
- Logs de erros

---

## 💻 Desenvolvimento

### Stack Tecnológico

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool (rápido!)
- **Supabase** - Backend/Auth
- **Recharts** - Gráficos
- **Lucide Icons** - Ícones
- **Sonner** - Toast notifications

### Padrões de Código

#### Componentes
- Functional components com hooks
- TypeScript strict mode
- Props tipadas
- Sem comentários (código auto-documentado)

#### Estilos
- Inline styles com objeto TypeScript
- Variáveis CSS customizadas (tema claro/escuro)
- Responsive design mobile-first

#### API/Dados
- Supabase RLS (segurança)
- Sem duplicação de queries
- Error handling robusto

### Comandos Úteis

```bash
# Desenvolvimento com hot reload
npm run dev

# Build otimizado
npm run build

# Verificar tipos TypeScript
npm run check

# Scan de strings hardcoded não traduzidas
npm run i18n:scan

# Preview do build
npm run preview
```

### Debug

Página de debug (dev only): `/debug`

Contém ferramentas de:
- Teste de autenticação
- Logs de console
- Visualização de estado

---

## 📦 Build e Deploy

### Build Local

```bash
npm run build
# Output: dist/
```

Arquivo gerado: `dist/index.html` + assets

### Tamanho do Build

- **Gzipped:** ~337 KB
- **Total:** ~1.2 MB

### Deploy

#### Vercel (Recomendado)

```bash
# 1. Conectar repositório
# 2. Variáveis de ambiente no Vercel
# 3. Deploy automático em push para main
```

#### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

#### Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 🐛 Troubleshooting

### "useI18n must be used within I18nProvider"

**Solução:** Certifique-se que `I18nProvider` envolve toda a app em `main.tsx`.

### Banco de dados vazio

**Solução:** Execute migrations Supabase:
```bash
supabase db push
```

### Erro de autenticação

**Solução:** Valide credenciais e verifique:
- Supabase URL e chaves corretas
- Usuário é master admin
- Sessão não expirou

### Build lento

**Solução:**
```bash
# Limpar cache
rm -rf dist node_modules
npm install
npm run build
```

---

## 📞 Suporte

- **Docs técnicas:** Ver arquivos `*.md` na raiz
- **Issues:** Abrir no GitHub
- **Contato:** Time de desenvolvimento

---

## 📝 Changelog

Veja `CHANGELOG.md` para histórico de versões.

---

**Última atualização:** Maio 2026
**Versão Admin:** 1.0.0
**Status:** ✅ Pronto para produção
