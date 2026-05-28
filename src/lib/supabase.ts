import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cbggntmqnulzdhpmying.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZ2dudG1xbnVsemRocG15aW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Njk5MjUsImV4cCI6MjA4ODA0NTkyNX0.Ean-9TvMQaIoeJpO3VNwHt8ddwN8loj2C9lSa6uIcEM'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Credenciais do Supabase não encontradas!')
}

// ─── Custom Fetch com Retry Automático ───
const normalizeHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {}
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  )
}

const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const maxRetries = 1
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: normalizeHeaders(options?.headers),
      })
      if (!response.ok && response.status >= 500 && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 800))
        continue
      }
      return response
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 800))
        continue
      }
    }
  }
  throw new Error(
    lastError?.message || 'Falha ao conectar ao Supabase. Verifique sua conexão de internet.'
  )
}

// Cliente normal — usado para login e operações autenticadas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storageKey: 'iap_admin_auth',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  global: {
    fetch: customFetch,
  },
})

// Cliente admin — usado para auth.admin.listUsers() e operações que exigem service_role
