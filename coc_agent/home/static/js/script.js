document.addEventListener('DOMContentLoaded', () => {
    // 為每個事件設置相應的倒數時間計算
    updateCountdown('clan_games', getNextClanGamesDate());
    updateCountdown('trader_refresh', getNextTraderRefreshDate());
    updateCountdown('raid_weekend', getNextRaidWeekendDate());
    updateCountdown('clan_war_league', getNextLeagueResetDate());
    updateCountdown('season_end', getNextSeasonEndDate());

    // 每秒更新一次
    setInterval(() => {
        updateCountdown('clan_games', getNextClanGamesDate());
        updateCountdown('trader_refresh', getNextTraderRefreshDate());
        updateCountdown('raid_weekend', getNextRaidWeekendDate());
        updateCountdown('clan_war_league', getNextLeagueResetDate());
        updateCountdown('season_end', getNextSeasonEndDate());
    }, 1000);

    // 更新倒數計時函數
    function updateCountdown(elementId, targetDate) {
        const countdownElement = document.getElementById(elementId).querySelector('.countdown');
        const now = new Date();
        const timeLeft = targetDate - now;

        if (timeLeft <= 0) {
            countdownElement.textContent = 'Event Started';
            return;
        }

        // 計算天、時、分、秒
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    // Clan Games：每月22號16:00
    function getNextClanGamesDate() {
        const now = new Date();
        const nextClanGames = new Date(now.getFullYear(), now.getMonth(), 22, 16, 0, 0);

        // 如果當前時間超過當月22號16:00，則設置到下個月
        if (now > nextClanGames) {
            nextClanGames.setMonth(nextClanGames.getMonth() + 1);
        }
        return nextClanGames;
    }

    // Trader Refresh：每周二16:00
    function getNextTraderRefreshDate() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const nextTraderRefresh = new Date(now);

        // 計算到下周二的時間
        nextTraderRefresh.setDate(now.getDate() + ((2 + 7 - dayOfWeek) % 7));
        nextTraderRefresh.setHours(16, 0, 0, 0);

        // 如果今天是周二但時間已過16:00，則跳到下周
        if (dayOfWeek === 2 && now.getHours() >= 16) {
            nextTraderRefresh.setDate(nextTraderRefresh.getDate() + 7);
        }
        return nextTraderRefresh;
    }

    // Raid Weekend：每周五15:00
    function getNextRaidWeekendDate() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const nextRaidWeekend = new Date(now);

        // 計算到下個周五的時間
        nextRaidWeekend.setDate(now.getDate() + ((5 + 7 - dayOfWeek) % 7));
        nextRaidWeekend.setHours(15, 0, 0, 0);

        // 如果今天是周五但時間已過15:00，則跳到下周
        if (dayOfWeek === 5 && now.getHours() >= 15) {
            nextRaidWeekend.setDate(nextRaidWeekend.getDate() + 7);
        }
        return nextRaidWeekend;
    }

    // Clan War League：每月1號16:00
    function getNextLeagueResetDate() {
        const now = new Date();
        const nextLeagueReset = new Date(now.getFullYear(), now.getMonth() + 1, 1, 16, 0, 0);
        return nextLeagueReset;
    }

    // Season End：每個月最後一周周一13:00
    function getNextSeasonEndDate() {
        const now = new Date();
        const nextSeasonEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 13, 0, 0); // 當月最後一天13:00
        const dayOfWeek = nextSeasonEnd.getDay();

        // 從當月最後一天向前找到周一
        nextSeasonEnd.setDate(nextSeasonEnd.getDate() - ((dayOfWeek + 6) % 7));
        return nextSeasonEnd;
    }
});
