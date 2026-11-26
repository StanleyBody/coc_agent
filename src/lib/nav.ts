export interface NavItem {
  label: string;
  path: string;
}

/** 導覽列 */
export const NAV_ITEMS: NavItem[] = [
  { label: '首頁', path: '/' },
  { label: '攻略影片', path: '/guides/' },
  { label: '升級資訊', path: '/upgrade-info/' },
  { label: '第六工人', path: '/sixth-builder/' },
  { label: '活動公告', path: '/events/' },
  { label: '聯繫我們', path: '/contact/' },
];

/** 頁尾「快速連結」 */
export const FOOTER_LINKS: NavItem[] = [
  { label: '首頁', path: '/' },
  { label: '攻略影片', path: '/guides/' },
  { label: '升級資訊', path: '/upgrade-info/' },
  { label: '第六工人計算機', path: '/sixth-builder/' },
];

/** 頁尾「支援」 */
export const FOOTER_SUPPORT: NavItem[] = [
  { label: '聯繫我們', path: '/contact/' },
  { label: '活動公告', path: '/events/' },
];
