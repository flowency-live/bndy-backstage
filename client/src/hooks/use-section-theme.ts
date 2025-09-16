import { useEffect } from "react";

export type SectionTheme = "band" | "user" | "gigs" | "calendar" | "playbook" | "setlist" | "songs";

const THEME_CLASS_PREFIX = "theme-";

/**
 * Hook to apply section-based themes to the document element.
 * This ensures that all child components (modals, dropdowns, etc.) inherit the section theme.
 * 
 * @param theme - The section theme to apply
 */
export function useSectionTheme(theme: SectionTheme) {
  useEffect(() => {
    const themeClass = `${THEME_CLASS_PREFIX}${theme}`;
    const documentElement = document.documentElement;
    
    // Remove any existing theme classes
    const existingThemeClasses = Array.from(documentElement.classList)
      .filter(className => className.startsWith(THEME_CLASS_PREFIX));
    
    existingThemeClasses.forEach(className => {
      documentElement.classList.remove(className);
    });
    
    // Add the new theme class
    documentElement.classList.add(themeClass);
    
    // Cleanup function to remove the theme class when component unmounts
    return () => {
      documentElement.classList.remove(themeClass);
    };
  }, [theme]);
}