import { useState, useEffect } from 'react'
import { supabase, authHelpers } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    authHelpers.getSession().then(({ session }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = authHelpers.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const sendOTP = async (phone: string) => {
    return await authHelpers.sendOTP(phone)
  }

  const verifyOTP = async (phone: string, token: string) => {
    return await authHelpers.verifyOTP(phone, token)
  }

  const signOut = async () => {
    const result = await authHelpers.signOut()
    if (!result.error) {
      setSession(null)
      setUser(null)
    }
    return result
  }

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    sendOTP,
    verifyOTP,
    signOut
  }
}