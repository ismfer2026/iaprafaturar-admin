import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Layout } from './Layout'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { admin, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!admin || !admin.is_active) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}
