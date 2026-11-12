type Cleanup = () => void;

/**
 * Runs `setup` on every page load, including client-side navigations, and runs the cleanup it
 * returns just before that page is swapped out. ClientRouter replaces the document without a
 * reload, so anything mounted outside this helper outlives the page it was built for.
 */
export function onPage(setup: () => void | Cleanup): void {
  document.addEventListener('astro:page-load', () => {
    const cleanup = setup();
    if (cleanup) document.addEventListener('astro:before-swap', cleanup, { once: true });
  });
}
