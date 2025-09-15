import { useEffect } from 'react'

/**
 * Hook to conditionally force dark mode based on a condition
 * This is useful for pages that should be dark mode only in certain contexts
 * (e.g., profile creation but not profile editing)
 */
export function useConditionalDarkMode(condition: boolean) {
  useEffect(() => {
    if (!condition) return

    const root = document.documentElement
    const originalClass = root.classList.contains('dark') ? 'dark' : 'light'
    
    // Force dark mode
    root.classList.remove('light', 'dark')
    root.classList.add('dark')
    
    // Restore original theme when component unmounts or condition changes
    return () => {
      root.classList.remove('light', 'dark')
      root.classList.add(originalClass)
    }
  }, [condition])
}