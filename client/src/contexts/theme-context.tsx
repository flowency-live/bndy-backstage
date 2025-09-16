import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'wouter'

type Theme = 'dark' | 'light'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
  toggleTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'bndy-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [location] = useLocation()
  const [theme, setTheme] = useState<Theme>(() => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement
    
    // Force dark mode on landing/auth pages - they must always be dark
    const isLandingOrAuthPage = ["/", "/login", "/onboarding"].includes(location) || location.startsWith("/invite/")
    
    if (isLandingOrAuthPage) {
      // Explicitly force dark mode for landing/auth pages
      root.classList.remove('light', 'dark')
      root.classList.add('dark')
    } else {
      // Apply user's theme preference for app pages
      root.classList.remove('light', 'dark')
      root.classList.add(theme)
    }
  }, [theme, location])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
    toggleTheme: () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}