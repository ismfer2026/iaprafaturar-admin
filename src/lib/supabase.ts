import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cbggntmqnulzdhpmying.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'UNDEFINED')

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY não configurada. Configure em .env.local')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-key-for-development',
)
