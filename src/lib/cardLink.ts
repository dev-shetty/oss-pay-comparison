/** Built from `href`, not `origin`: `origin` is the string "null" when the build is opened from disk. */
export function cardUrl(id: string): string {
  const url = new URL(window.location.href);
  url.hash = id;
  return url.toString();
}

/** The Clipboard API is missing on plain-http hosts other than localhost, so fall back to execCommand. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('copy failed');
  }
}

export function copyCardLink(id: string): Promise<void> {
  return copyText(cardUrl(id));
}

/** Cards mount after load and charts resize after first paint, so the browser's own jump to `#id` lands short. */
export function scrollToHashCard() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' })));
}
