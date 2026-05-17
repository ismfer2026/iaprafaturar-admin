import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner' // 🆕 IMPORT DO TOASTER ADICIONADO AQUI
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ProfessionalsPage } from './pages/Professionals'
import { PlansPage } from './pages/Plans'
import { AmbassadorsPage } from './pages/Ambassadors'
import { AgentsPage } from './pages/Agents'
import { CampaignsPage } from './pages/Campaigns'
import { MetricsPage } from './pages/Metrics'
import { NotificationsPage } from './pages/Notifications'

// PÁGINAS DE ONBOARDING E TESTE
import OnboardingPage from './pages/OnboardingPage'
import TestePremium from './pages/TestePremium'

// 🆕 NOVO: Import da página de Configurações Globais
import SettingsPage from './pages/Settings'
import { NexusPage } from './pages/Nexus'
import Improvements from './pages/Improvements'
import { DebugPage } from './pages/Debug'

function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/teste-premium" element={<TestePremium />} />

      {/* Debug (apenas em desenvolvimento) */}
      {import.meta.env.DEV && <Route path="/debug" element={<ProtectedRoute><DebugPage /></ProtectedRoute>} />}

      {/* Redirecionamento Padrão */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Rotas Protegidas (Apenas Master Admin) */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/cadastro" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/profissionais" element={<ProtectedRoute><ProfessionalsPage /></ProtectedRoute>} />
      <Route path="/planos" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
      <Route path="/embaixadores" element={<ProtectedRoute><AmbassadorsPage /></ProtectedRoute>} />
      <Route path="/agentes" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
      <Route path="/campanhas" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
      <Route path="/notificacoes" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/metricas" element={<ProtectedRoute><MetricsPage /></ProtectedRoute>} />

      {/* Rota do Nexus Admin (Coração do SaaS) */}
      <Route path="/nexus" element={<ProtectedRoute><NexusPage /></ProtectedRoute>} />

      {/* Rota de Histórico de Evolução */}
      <Route path="/melhorias" element={<ProtectedRoute><Improvements /></ProtectedRoute>} />

      {/* Rota das Configurações da Plataforma */}
      <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />

          {/* 🆕 O TOASTER VEM AQUI (Invisível até ser ativado) */}
          <Toaster position="top-right" richColors />

        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App