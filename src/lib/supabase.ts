import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

let client: SupabaseClient<Database> | null = null
let configurationError: string | null = null

if (projectUrl && publicKey) {
  try {
    const parsedUrl = new URL(projectUrl)
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error('L’URL Supabase doit utiliser HTTP ou HTTPS.')
    client = createClient<Database>(parsedUrl.href.replace(/\/$/, ''), publicKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  } catch (error) {
    configurationError = error instanceof Error ? error.message : 'Configuration Supabase invalide.'
  }
}

export const backendConfigurationError = configurationError
export const backendConfigured = Boolean(client)
export const supabase = client
