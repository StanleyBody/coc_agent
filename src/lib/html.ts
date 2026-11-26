/** 放進 innerHTML 前跳脫文字；名稱與譯文來自外部資料（Wiki、遊戲語系檔），一律經過這裡 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
