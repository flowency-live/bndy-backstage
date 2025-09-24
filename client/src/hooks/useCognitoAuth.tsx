import { useState, useEffect, createContext, useContext } from 'react'
import { authHelpers, AuthSession } from '@/lib/cognito'
import type { CognitoUser } from 'amazon-cognito-identity-js'

interface CognitoAuthContextType {
  user: CognitoUser | null
  session: AuthSession | null
  loading: boolean
  isAuthenticated: boolean
  sendOTP: (phone: string) => Promise<any>
  verifyOTP: (phone: string, token: string) => Promise<any>
  signOut: () => Promise<any>
}

const CognitoAuthContext = createContext<CognitoAuthContextType | undefined>(undefined)

export function CognitoAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useCognitoAuthHook()

  return (
    <CognitoAuthContext.Provider value={auth}>
      {children}
    </CognitoAuthContext.Provider>
  )
}

export function useCognitoAuth() {
  const context = useContext(CognitoAuthContext)
  if (context === undefined) {
    throw new Error('useCognitoAuth must be used within a CognitoAuthProvider')
  }
  return context
}

function useCognitoAuthHook() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: session } = await authHelpers.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.warn('Failed to get initial session:', error)
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const sendOTP = async (phone: string) => {
    return await authHelpers.sendOTP(phone)
  }

  const verifyOTP = async (phone: string, token: string) => {
    console.log('🔍 CLAUDE DEBUG: verifyOTP called', { phone, token })

    try {
      const result = await authHelpers.verifyOTP(phone, token)
      console.log('🔍 CLAUDE DEBUG: Cognito result', result)
      if (result.data) {
        setSession(result.data)
        setUser(result.data.user)
        setLoading(false)
      }
      return result
    } catch (error) {
      console.error('OTP verification failed:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const result = await authHelpers.signOut()
      setSession(null)
      setUser(null)
      return result
    } catch (error) {
      console.error('Sign out failed:', error)
      return { error }
    }
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