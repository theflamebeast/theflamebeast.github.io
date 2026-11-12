import { canHover, isWide } from './prefs';

const HOVER_CLOSE_MS = 180;
const HOVER_MIN_WIDTH = 720;

type OpenedBy = 'hover' | 'click';

export function initWorkPicker(): () => void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const toggle = header?.querySelector<HTMLAnchorElement>('[data-work-toggle]');
  const panel = header?.querySelector<HTMLElement>('[data-work-panel]');
  if (!header || !toggle || !panel) return () => {};

  const items = [...panel.querySelectorAll<HTMLElement>('[data-work-item]')];
  const previews = new Map(
    [...panel.querySelectorAll<HTMLElement>('[data-work-preview]')].map((el) => [el.dataset.workPreview!, el]),
  );
  const listeners = new AbortController();
  const signal = listeners.signal;
  let openedBy: OpenedBy | null = null;
  let closeTimer = 0;

  toggle.setAttribute('role', 'button');
  toggle.setAttribute('aria-expanded', 'false');

  const cancelClose = () => {
    window.clearTimeout(closeTimer);
    closeTimer = 0;
  };

  const activate = (item: HTMLElement) => {
    for (const other of items) other.toggleAttribute('data-active', other === item);
    for (const [id, preview] of previews) preview.toggleAttribute('data-active', id === item.dataset.workItem);
  };

  const open = (by: OpenedBy) => {
    cancelClose();
    if (openedBy) {
      // A click on a picker the pointer opened keeps it open instead of closing it.
      if (by === 'click') openedBy = 'click';
      return;
    }
    openedBy = by;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    header.setAttribute('data-picker-open', '');
    if (items[0]) activate(items[0]);
  };

  const close = () => {
    cancelClose();
    if (!openedBy) return;
    openedBy = null;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    header.removeAttribute('data-picker-open');
  };

  const hoverOpens = (event: PointerEvent) => event.pointerType !== 'touch' && canHover() && isWide(HOVER_MIN_WIDTH);

  toggle.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      if (openedBy === 'click') close();
      else open('click');
    },
    { signal },
  );
  toggle.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== ' ') return;
      event.preventDefault();
      if (openedBy === 'click') close();
      else open('click');
    },
    { signal },
  );
  toggle.addEventListener('pointerenter', (event) => hoverOpens(event) && open('hover'), { signal });

  header.addEventListener('pointerenter', cancelClose, { signal });
  header.addEventListener(
    'pointerleave',
    (event) => {
      if (openedBy !== 'hover' || event.pointerType === 'touch') return;
      cancelClose();
      closeTimer = window.setTimeout(close, HOVER_CLOSE_MS);
    },
    { signal },
  );
  header.addEventListener(
    'focusout',
    (event) => {
      // A null target is a mouse press on something unfocusable; outside clicks are handled below,
      // and one on the panel's blank space must not close it.
      const next = event.relatedTarget;
      if (next instanceof Node && !header.contains(next)) close();
    },
    { signal },
  );

  for (const item of items) {
    item.addEventListener('pointerenter', () => activate(item), { signal });
    item.addEventListener('focus', () => activate(item), { signal });
    item.addEventListener('click', close, { signal });
  }

  document.addEventListener(
    'click',
    (event) => {
      if (openedBy && event.target instanceof Node && !header.contains(event.target)) close();
    },
    { signal },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !openedBy) return;
      close();
      toggle.focus();
    },
    { signal },
  );

  return () => {
    listeners.abort();
    close();
    for (const el of [...items, ...previews.values()]) el.removeAttribute('data-active');
    toggle.removeAttribute('role');
    toggle.removeAttribute('aria-expanded');
  };
}
