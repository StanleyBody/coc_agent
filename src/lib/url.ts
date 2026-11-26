/** 加上 GitHub Pages 的 base 路徑，例如 url('/events/') → '/coc_agent/events/' */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
