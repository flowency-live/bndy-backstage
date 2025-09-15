import { useLayoutEffect } from 'react'

/**
 * Hook to conditionally force dark mode based on a condition
 * This is useful for pages that should be dark mode only in certain contexts
 * (e.g., profile creation but not profile editing)
 * 
 * Uses useLayoutEffect to apply theme changes before paint to prevent flicker
 */
export function useConditionalDarkMode(condition: boolean) {
  useLayoutEffect(() => {
    if (!condition) return

    const root = document.documentElement
    const originalClass = root.classList.contains('dark') ? 'dark' : 'light'
    
    // Force dark mode before paint
    root.classList.remove('light', 'dark')
    root.classList.add('dark')
    
    // Restore original theme when component unmounts or condition changes
    return () => {
      root.classList.remove('light', 'dark')
      root.classList.add(originalClass)
    }
  }, [condition])
}