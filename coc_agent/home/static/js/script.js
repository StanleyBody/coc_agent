/**
 * ============================================
 * Clash of Clans 社區 - 主要腳本
 * Main JavaScript with Theme Toggle & Animations
 * ============================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===== 主題切換功能 =====
    initThemeToggle();
    
    // ===== 導航列滾動效果 =====
    initNavbarScroll();
    
    // ===== 滾動動畫 =====
    initScrollAnimations();
    
    // ===== 返回頂部按鈕 =====
    initBackToTop();
    
    // ===== 移動端選單 =====
    initMobileMenu();
    
    // ===== 活動倒數計時 =====
    initCountdowns();
});

/**
 * 主題切換功能
 */
function initThemeToggle() {
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
            // 添加過渡動畫類別
            body.classList.add('theme-transition');
            
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // 移除過渡動畫類別
            setTimeout(() => {
                body.classList.remove('theme-transition');
            }, 500);
        });
    }
    
    // 監聽系統主題變化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}

/**
 * 導航列滾動效果
 */
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    
    if (!navbar) return;
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始檢查
}

/**
 * 滾動動畫
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animatedElements.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

/**
 * 返回頂部按鈕
 */
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    
    if (!backToTop) return;
    
    const handleScroll = () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * 移動端選單
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navbarNav = document.getElementById('navbarNav');
    
    if (!menuToggle || !navbarNav) return;
    
    menuToggle.addEventListener('click', () => {
        navbarNav.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
    
    // 點擊連結時關閉選單
    navbarNav.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navbarNav.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
    
    // 點擊外部關閉選單
    document.addEventListener('click', (e) => {
        if (!navbarNav.contains(e.target) && !menuToggle.contains(e.target)) {
            navbarNav.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    });
}

/**
 * 活動倒數計時
 */
function initCountdowns() {
    // 初始更新
    updateAllCountdowns();
    
    // 每秒更新
    setInterval(updateAllCountdowns, 1000);
}

function updateAllCountdowns() {
    updateCountdown('clan_games', getNextClanGamesDate());
    updateCountdown('trader_refresh', getNextTraderRefreshDate());
    updateCountdown('raid_weekend', getNextRaidWeekendDate());
    updateCountdown('clan_war_league', getNextLeagueResetDate());
    updateCountdown('season_end', getNextSeasonEndDate());
}

/**
 * 更新單個倒數計時
 */
function updateCountdown(elementId, targetDate) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const countdownElement = element.querySelector('.event-countdown');
    if (!countdownElement) return;
    
    const now = new Date();
    const timeLeft = targetDate - now;

    if (timeLeft <= 0) {
        countdownElement.textContent = '活動進行中！';
        countdownElement.classList.add('active');
        return;
    }

    // 計算天、時、分、秒
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // 格式化顯示
    let displayText = '';
    if (days > 0) {
        displayText = `${days}天 ${hours}時 ${minutes}分`;
    } else if (hours > 0) {
        displayText = `${hours}時 ${minutes}分 ${seconds}秒`;
    } else {
        displayText = `${minutes}分 ${seconds}秒`;
    }
    
    countdownElement.textContent = displayText;
    countdownElement.classList.remove('active');
}

/**
 * 部落競賽：每月22號16:00 (台灣時間)
 */
function getNextClanGamesDate() {
    const now = new Date();
    const nextClanGames = new Date(now.getFullYear(), now.getMonth(), 22, 16, 0, 0);

    // 如果當前時間超過當月22號16:00，則設置到下個月
    if (now > nextClanGames) {
        nextClanGames.setMonth(nextClanGames.getMonth() + 1);
    }
    return nextClanGames;
}

/**
 * 商店重置：每周二16:00 (台灣時間)
 */
function getNextTraderRefreshDate() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const nextTraderRefresh = new Date(now);

    // 計算到下周二的時間
    let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
    if (daysUntilTuesday === 0 && now.getHours() >= 16) {
        daysUntilTuesday = 7;
    }
    
    nextTraderRefresh.setDate(now.getDate() + daysUntilTuesday);
    nextTraderRefresh.setHours(16, 0, 0, 0);
    
    return nextTraderRefresh;
}

/**
 * 突襲周末：每周五15:00 (台灣時間)
 */
function getNextRaidWeekendDate() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const nextRaidWeekend = new Date(now);

    // 計算到下個周五的時間
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (daysUntilFriday === 0 && now.getHours() >= 15) {
        daysUntilFriday = 7;
    }
    
    nextRaidWeekend.setDate(now.getDate() + daysUntilFriday);
    nextRaidWeekend.setHours(15, 0, 0, 0);
    
    return nextRaidWeekend;
}

/**
 * 部落聯賽：每月1號16:00 (台灣時間)
 */
function getNextLeagueResetDate() {
    const now = new Date();
    const nextLeagueReset = new Date(now.getFullYear(), now.getMonth() + 1, 1, 16, 0, 0);
    return nextLeagueReset;
}

/**
 * 賽季結束：每個月最後一週週一13:00 (台灣時間)
 */
function getNextSeasonEndDate() {
    const now = new Date();
    const nextSeasonEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 13, 0, 0); // 當月最後一天
    const dayOfWeek = nextSeasonEnd.getDay();

    // 從當月最後一天向前找到週一
    const daysToSubtract = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
    nextSeasonEnd.setDate(nextSeasonEnd.getDate() - daysToSubtract);
    
    // 如果計算出的日期已過，則計算下個月
    if (now > nextSeasonEnd) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 13, 0, 0);
        const nextDayOfWeek = nextMonth.getDay();
        const nextDaysToSubtract = (nextDayOfWeek === 0) ? 6 : nextDayOfWeek - 1;
        nextMonth.setDate(nextMonth.getDate() - nextDaysToSubtract);
        return nextMonth;
    }
    
    return nextSeasonEnd;
}

/**
 * 平滑滾動到錨點
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
