const NOTE_MS = 2000;

// A plain click on the email copies it. If copying is impossible or refused the mail app opens
// instead, so the click never goes dead.
export function initCopyEmail(): () => void {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-copy-email]');
  const status = document.querySelector<HTMLElement>('[data-copy-status]');
  const listeners = new AbortController();
  let timer = 0;
  let handOver = false;

  const say = (text: string) => {
    window.clearTimeout(timer);
    if (!status) return;
    status.textContent = text;
    if (text) timer = window.setTimeout(() => (status.textContent = ''), NOTE_MS);
  };

  for (const link of links) {
    link.addEventListener(
      'click',
      (event) => {
        if (handOver || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!navigator.clipboard?.writeText) return;
        event.preventDefault();
        navigator.clipboard.writeText(link.dataset.copyEmail ?? '').then(
          () => say('Copied'),
          () => {
            handOver = true;
            link.click();
            handOver = false;
          },
        );
      },
      { signal: listeners.signal },
    );
  }

  return () => {
    listeners.abort();
    say('');
  };
}
