import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AlertCircle, Mail, Lock } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Branding */}
      <div 
        className="hidden md:flex md:w-1/2 flex-col items-center justify-between p-12"
        style={{ backgroundColor: '#0D6E6E' }}
      >
        {/* Logo e Slogan */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
            iaprafaturar
          </h1>
          <p className="text-lg text-white text-opacity-80 text-center max-w-xs">
            Painel Administrativo
          </p>
          <div className="mt-12 w-20 h-1 rounded-full" style={{ backgroundColor: '#F4A623' }}></div>
        </div>

        {/* Frase Inspiracional no Rodapé */}
        <div className="pb-6">
          <p className="text-white text-opacity-70 text-center text-sm max-w-xs leading-relaxed">
            "Gerencie seus profissionais, maximize sua eficiência, multiplique seus resultados."
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="md:hidden text-center mb-10">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#0D6E6E' }}>
              iaprafaturar
            </h1>
            <p className="text-gray-600 text-sm">Painel Administrativo</p>
          </div>

          {/* Card do Formulário */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1A1A2E' }}>
              Bem-vindo
            </h2>
            <p className="text-gray-600 text-sm mb-8">
              Entre com suas credenciais para acessar o painel
            </p>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail 
                    size={18} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    style={{ focusRingColor: '#0D6E6E' }}
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock 
                    size={18} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    style={{ focusRingColor: '#0D6E6E' }}
                    required
                  />
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg text-white font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#0D6E6E',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#094b4b'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0D6E6E'
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          </div>

          {/* Rodapé */}
          <p className="text-center text-xs text-gray-500 mt-8">
            Acesso restrito apenas para administradores convidados.
          </p>
        </div>
      </div>
    </div>
  )
}
