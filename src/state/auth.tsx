import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '../types'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileError: string | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const loadProfile = useCallback(async (userId?: string) => {
    if (!supabase || !userId) {
      setProfile(null)
      setProfileError(null)
      return
    }
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, avatar_url').eq('id', userId).maybeSingle()
    if (error) {
      setProfileError(error.message)
      setProfile(null)
      return
    }
    setProfile(data as Profile | null)
    setProfileError(data ? null : 'Votre profil est en cours de création. Réessayez dans quelques instants.')
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id)
  }, [loadProfile, session?.user.id])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (active) setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      queueMicrotask(() => { void loadProfile(nextSession?.user.id) })
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }, [])

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileError,
    refreshProfile,
    signOut,
  }), [session, profile, loading, profileError, refreshProfile, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}
