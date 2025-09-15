import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, authHelpers } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface SupabaseAuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  sendOTP: (phone: string) => Promise<any>
  verifyOTP: (phone: string, token: string) => Promise<any>
  signOut: () => Promise<any>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useSupabaseAuthHook()
  
  return (
    <SupabaseAuthContext.Provider value={auth}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

function useSupabaseAuthHook() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for development tokens and create mock sessions
  const checkDevSession = () => {
    if (import.meta.env.DEV) {
      const devToken = localStorage.getItem('dev-auth-token')
      if (devToken) {
        // Create a mock session for development
        const mockSession = {
          access_token: devToken,
          refresh_token: 'dev-refresh-token',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: {
            id: devToken.includes('GOD_MODE') ? 'dev-god-mode-user' : `dev-user-${Date.now()}`,
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            phone: devToken.includes('GOD_MODE') ? '+447758240770' : '+44000000000',
            email: undefined,
            app_metadata: { provider: 'phone', providers: ['phone'] },
            user_metadata: { phone: devToken.includes('GOD_MODE') ? '+447758240770' : '+44000000000' }
          }
        } as Session
        
        return { session: mockSession, user: mockSession.user }
      }
    }
    return null
  }

  useEffect(() => {
    const initAuth = async () => {
      // First check for dev session
      const devSession = checkDevSession()
      if (devSession) {
        setSession(devSession.session)
        setUser(devSession.user)
        setLoading(false)
        return
      }

      // Otherwise get regular Supabase session
      const { session } = await authHelpers.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = authHelpers.onAuthStateChange(
      (event, session) => {
        // Check for dev session first
        const devSession = checkDevSession()
        if (devSession) {
          setSession(devSession.session)
          setUser(devSession.user)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
        setLoading(false)
      }
    )

    // Listen for dev token changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dev-auth-token') {
        const devSession = checkDevSession()
        if (devSession) {
          setSession(devSession.session)
          setUser(devSession.user)
        } else if (!e.newValue) {
          // Dev token removed, check regular auth
          authHelpers.getSession().then(({ session }) => {
            setSession(session)
            setUser(session?.user ?? null)
          })
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
    }
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