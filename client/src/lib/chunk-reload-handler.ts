/**
 * Handles chunk load failures by auto-reloading the page
 * This prevents 404 errors when new deployments change chunk hashes
 */

const RELOAD_KEY = 'chunk-reload-attempted';
const RELOAD_TIMEOUT = 5000; // 5 seconds

export function setupChunkReloadHandler() {
  // Listen for unhandled promise rejections (chunk load errors)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;

    // Check if this is a chunk load error
    const isChunkLoadError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module') ||
      (error?.name === 'TypeError' && error?.message?.includes('import'));

    if (isChunkLoadError) {
      const hasReloaded = sessionStorage.getItem(RELOAD_KEY);

      if (!hasReloaded) {
        console.warn('Chunk load error detected. Reloading page to fetch latest assets...');
        sessionStorage.setItem(RELOAD_KEY, Date.now().toString());

        // Small delay to allow any pending operations to complete
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        // Check if reload was recent (within timeout)
        const reloadTime = parseInt(hasReloaded, 10);
        const timeSinceReload = Date.now() - reloadTime;

        if (timeSinceReload > RELOAD_TIMEOUT) {
          // It's been a while, try reloading again
          sessionStorage.setItem(RELOAD_KEY, Date.now().toString());
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else {
          // Already reloaded recently, clear the flag and show error
          sessionStorage.removeItem(RELOAD_KEY);
          console.error('Chunk load error persists after reload:', error);
        }
      }

      // Prevent the error from showing in console (we're handling it)
      event.preventDefault();
    }
  });

  // Clear the reload flag on successful load
  window.addEventListener('load', () => {
    const hasReloaded = sessionStorage.getItem(RELOAD_KEY);
    if (hasReloaded) {
      const reloadTime = parseInt(hasReloaded, 10);
      const timeSinceReload = Date.now() - reloadTime;

      // If we successfully loaded after a reload, clear the flag
      if (timeSinceReload < RELOAD_TIMEOUT) {
        console.info('Page reloaded successfully after chunk load error');
        sessionStorage.removeItem(RELOAD_KEY);
      }
    }
  });
}
