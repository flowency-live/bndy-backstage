import { useEffect } from 'react'

/**
 * Hook to force dark mode on specific pages (login, landing, etc.)
 * This overrides the user's theme preference for branding consistency
 */
export function useForceDarkMode() {
  useEffect(() => {
    const root = document.documentElement
    const originalClass = root.classList.contains('dark') ? 'dark' : 'light'
    
    // Force dark mode
    root.classList.remove('light', 'dark')
    root.classList.add('dark')
    
    // Restore original theme when component unmounts
    return () => {
      root.classList.remove('light', 'dark')
      root.classList.add(originalClass)
    }
  }, [])
}