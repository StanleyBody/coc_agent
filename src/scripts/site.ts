/**
 * 全站共用互動：主題切換、導航列捲動效果、捲動動畫、返回頂部、手機選單
 * 主題在 <head> 的 inline script 先套用，這裡只負責切換與同步。
 */

const THEME_KEY = 'theme';
type Theme = 'light' | 'dark';

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 私密瀏覽等情況無法儲存，僅本次有效
  }
}

function initThemeToggle(): void {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  toggle?.addEventListener('click', () => {
    document.body.classList.add('theme-transition');
    const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    saveTheme(next);
    window.setTimeout(() => document.body.classList.remove('theme-transition'), 500);
  });

  // 使用者沒有手動設定時，跟著系統主題變化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!readSavedTheme()) root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
}

function initNavbarScroll(): void {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const update = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initScrollAnimations(): void {
  const elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length) return;
  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('animated'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  );
  elements.forEach((el) => observer.observe(el));
}

function initBackToTop(): void {
  const button = document.getElementById('backToTop');
  if (!button) return;
  const update = () => button.classList.toggle('visible', window.scrollY > 500);
  window.addEventListener('scroll', update, { passive: true });
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  update();
}

function initMobileMenu(): void {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('navbarNav');
  if (!toggle || !nav) return;

  const setOpen = (open: boolean) => {
    nav.classList.toggle('active', open);
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('active')));
  nav.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!nav.contains(target) && !toggle.contains(target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

export function initSite(): void {
  initThemeToggle();
  initNavbarScroll();
  initScrollAnimations();
  initBackToTop();
  initMobileMenu();
}
