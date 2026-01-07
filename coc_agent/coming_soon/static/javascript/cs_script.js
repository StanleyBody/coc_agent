/**
 * ============================================
 * Clash of Clans 社區 - Coming Soon 腳本
 * Coming Soon Page JavaScript
 * ============================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 初始化主題
    initTheme();
    
    // 初始化倒數計時器
    initCountdown();
});

/**
 * 主題切換功能
 */
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // 檢查本地儲存的主題設定
    const savedTheme = localStorage.getItem('theme');
    
    // 檢查系統主題偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 設定初始主題
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    } else if (!prefersDark) {
        body.setAttribute('data-theme', 'light');
    }
    
    // 切換主題事件
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

/**
 * 倒數計時器
 */
function initCountdown() {
    // 設定目標日期 - 下個月的第一天
    const now = new Date();
    const countDownDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0).getTime();
    
    // 更新倒數計時
    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = countDownDate - now;
        
        if (distance < 0) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
            return;
        }
        
        // 計算時間
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // 格式化並更新顯示
        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    };
    
    // 初始更新
    updateCountdown();
    
    // 每秒更新
    setInterval(updateCountdown, 1000);
}

/**
 * 處理訂閱表單提交
 */
function handleSubscribe(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    
    // 顯示成功訊息 (實際應用中應該發送到後端)
    alert(`感謝您的訂閱！我們會在功能上線時通知您：${email}`);
    
    // 清空表單
    form.reset();
}
