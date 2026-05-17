// Utilitário para debug de queries Supabase
export function debugQuery(table: string, action: string, ...details: unknown[]) {
  if (import.meta.env.DEV) {
    console.log(`📊 [Supabase] ${table}.${action}`, ...details)
  }
}

export function debugQueryError(table: string, action: string, error: unknown) {
  console.error(`❌ [Supabase] ${table}.${action} ERRO:`, error)
}

export function debugQuerySuccess(table: string, action: string, count: number) {
  if (import.meta.env.DEV) {
    console.log(`✅ [Supabase] ${table}.${action} → ${count} registros`)
  }
}
