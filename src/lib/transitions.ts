// When a second navigation starts within a frame of the first (back then forward, a double click),
// the router skips the first page swap's view transition. Skipping rejects that transition's `ready`,
// which the router never handles, so the browser reports an unhandled AbortError. Nothing on this
// site waits on `ready` (global.css turns every transition animation off), so the rejection is only
// marked as handled; the swap itself still completes.
export function quietSkippedTransitions(): void {
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  document.startViewTransition = ((...args: Parameters<typeof start>) => {
    const transition = start(...args);
    transition.ready.catch(() => {});
    return transition;
  }) as typeof document.startViewTransition;
}
