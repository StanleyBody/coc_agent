/**
 * ============================================
 * Clash of Clans 社區 - 升級資訊頁面腳本
 * Upgrade Info Page JavaScript
 * ============================================
 */

// 全局資料存儲
let upgradeData = null;
let currentTab = 'buildings';
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化分頁
    initTabs();
    
    // 初始化篩選器
    initFilters();
    
    // 初始化彈窗
    initModal();
    
    // 初始化減免面板
    initDiscountPanel();
    
    // 載入資料
    loadData();
    
    // 設置自動刷新（每 30 秒）
    startAutoRefresh();
});

/**
 * 主題切換
 */
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    } else if (!prefersDark) {
        body.setAttribute('data-theme', 'light');
    }
    
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
 * 減免面板
 */
function initDiscountPanel() {
    const toggle = document.getElementById('discountToggle');
    const panel = document.getElementById('discountPanel');
    const resetBtn = document.getElementById('discountReset');
    
    // 展開/收合
    toggle.addEventListener('click', () => {
        panel.classList.toggle('open');
    });
    
    // Radio 選擇事件
    document.querySelectorAll('.discount-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            // 更新 active 狀態
            const group = radio.closest('.discount-options');
            group.querySelectorAll('.discount-option').forEach(opt => opt.classList.remove('active'));
            radio.closest('.discount-option').classList.add('active');
            
            onDiscountChange();
        });
    });
    
    // 重置按鈕
    resetBtn.addEventListener('click', () => {
        document.querySelectorAll('.discount-option input[value="0"]').forEach(radio => {
            radio.checked = true;
            const group = radio.closest('.discount-options');
            group.querySelectorAll('.discount-option').forEach(opt => opt.classList.remove('active'));
            radio.closest('.discount-option').classList.add('active');
        });
        onDiscountChange();
    });
    
    // 從 localStorage 載入設定
    loadDiscountSettings();
}

function getDiscountSettings() {
    const goldPass = parseInt(document.querySelector('input[name="goldPass"]:checked')?.value || 0);
    const worker = parseInt(document.querySelector('input[name="worker"]:checked')?.value || 0);
    const total = goldPass + worker;
    return { goldPass, worker, total };
}

function onDiscountChange() {
    const settings = getDiscountSettings();
    
    // 更新總減免顯示
    const totalEl = document.getElementById('totalDiscount');
    totalEl.textContent = settings.total > 0 ? `-${settings.total}%` : '0%';
    totalEl.classList.toggle('zero', settings.total === 0);
    
    // 更新面板摘要
    const summaryEl = document.getElementById('discountSummary');
    if (settings.total > 0) {
        const parts = [];
        if (settings.goldPass > 0) {
            const names = { 10: '白銀', 15: '黃金', 20: '鑽石' };
            parts.push(`月卡: ${names[settings.goldPass]}(-${settings.goldPass}%)`);
        }
        if (settings.worker > 0) {
            const lvl = { 5: 'Lv.1', 10: 'Lv.2', 15: 'Lv.3' };
            parts.push(`工人: ${lvl[settings.worker]}(-${settings.worker}%)`);
        }
        summaryEl.textContent = parts.join(' | ') + ` | 總減免: -${settings.total}%`;
        summaryEl.classList.add('has-discount');
    } else {
        summaryEl.textContent = '未設定減免';
        summaryEl.classList.remove('has-discount');
    }
    
    // 儲存設定
    saveDiscountSettings();
    
    // 重新渲染數據
    renderCurrentTab();
    updateSummaryDashboard();
}

function saveDiscountSettings() {
    const settings = getDiscountSettings();
    localStorage.setItem('coc_discount', JSON.stringify(settings));
}

function loadDiscountSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem('coc_discount'));
        if (saved && (saved.goldPass > 0 || saved.worker > 0)) {
            // 設定月卡 Radio
            const gpRadio = document.querySelector(`input[name="goldPass"][value="${saved.goldPass}"]`);
            if (gpRadio) {
                gpRadio.checked = true;
                const gpGroup = gpRadio.closest('.discount-options');
                gpGroup.querySelectorAll('.discount-option').forEach(opt => opt.classList.remove('active'));
                gpRadio.closest('.discount-option').classList.add('active');
            }
            // 設定工人 Radio
            const wkRadio = document.querySelector(`input[name="worker"][value="${saved.worker}"]`);
            if (wkRadio) {
                wkRadio.checked = true;
                const wkGroup = wkRadio.closest('.discount-options');
                wkGroup.querySelectorAll('.discount-option').forEach(opt => opt.classList.remove('active'));
                wkRadio.closest('.discount-option').classList.add('active');
            }
            onDiscountChange();
        }
    } catch (e) {
        // ignore parse errors
    }
}

function applyDiscount(value, discountPercent) {
    if (!value || discountPercent <= 0) return value;
    return Math.floor(value * (1 - discountPercent / 100));
}

function formatWithDiscount(originalValue, discountPercent, formatter) {
    if (!originalValue) return formatter(originalValue);
    if (discountPercent <= 0) return formatter(originalValue);
    const discounted = applyDiscount(originalValue, discountPercent);
    return `<span class="cost-original">${formatter(originalValue)}</span> <span class="cost-discounted">${formatter(discounted)}</span>`;
}

function updateSummaryDashboard() {
    if (!upgradeData) return;
    const { total } = getDiscountSettings();
    const filters = getFilters();
    
    let totalCostOriginal = 0;
    let totalTimeOriginal = 0;
    
    // 計算建築費用/時間
    const buildings = upgradeData.buildings || [];
    buildings.forEach(b => {
        let levels = b.levels;
        if (filters.th) levels = levels.filter(l => l.th_required <= parseInt(filters.th));
        levels.forEach(l => {
            totalCostOriginal += (l.gold_cost || 0) + (l.elixir_cost || 0) + (l.dark_elixir_cost || 0);
            totalTimeOriginal += (l.build_time || 0);
        });
    });
    
    // 計算英雄費用/時間
    const heroes = upgradeData.heroes || [];
    heroes.forEach(h => {
        let levels = h.levels;
        if (filters.th) levels = levels.filter(l => l.th_required <= parseInt(filters.th));
        levels.forEach(l => {
            totalCostOriginal += (l.dark_elixir_cost || 0);
            totalTimeOriginal += (l.upgrade_time || 0);
        });
    });
    
    // 計算兵種費用/時間
    const troops = upgradeData.troops || [];
    troops.forEach(t => {
        let levels = t.levels;
        if (filters.th) levels = levels.filter(l => l.lab_required <= parseInt(filters.th));
        levels.forEach(l => {
            totalCostOriginal += (l.elixir_cost || 0) + (l.dark_elixir_cost || 0);
            totalTimeOriginal += (l.upgrade_time || 0);
        });
    });
    
    const totalCostDiscounted = applyDiscount(totalCostOriginal, total) || totalCostOriginal;
    const totalTimeDiscounted = applyDiscount(totalTimeOriginal, total) || totalTimeOriginal;
    const costSaved = totalCostOriginal - totalCostDiscounted;
    const timeSaved = totalTimeOriginal - totalTimeDiscounted;
    
    // 更新 DOM
    document.getElementById('totalCost').textContent = formatLargeNumber(totalCostDiscounted);
    document.getElementById('totalTime').textContent = formatTimeLong(totalTimeDiscounted);
    
    const savingsEl = document.getElementById('totalSavings');
    const savingsBadge = document.getElementById('savingsBadge');
    const timeEl = document.getElementById('timeSavings');
    const timeBadge = document.getElementById('timeBadge');
    
    if (total > 0) {
        savingsEl.textContent = formatLargeNumber(costSaved);
        savingsBadge.textContent = `-${total}%`;
        savingsBadge.style.display = '';
        timeEl.textContent = formatTimeLong(timeSaved);
        timeBadge.textContent = `-${total}%`;
        timeBadge.style.display = '';
    } else {
        savingsEl.textContent = '-';
        savingsBadge.style.display = 'none';
        timeEl.textContent = '-';
        timeBadge.style.display = 'none';
    }
}

function formatLargeNumber(num) {
    if (!num || num === 0) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toLocaleString();
}

function formatTimeLong(seconds) {
    if (!seconds || seconds === 0) return '0';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days} 天 ${hours} 時`;
    if (hours > 0) return `${hours} 時`;
    return `${Math.floor(seconds / 60)} 分`;
}

/**
 * 分頁切換
 */
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // 更新標籤狀態
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // 更新內容區域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-content`);
    });
    
    // 更新篩選器顯示
    document.getElementById('categoryFilter').style.display = tabName === 'buildings' ? 'block' : 'none';
    document.getElementById('troopTypeFilter').style.display = tabName === 'troops' ? 'block' : 'none';
    
    // 重新渲染資料
    renderCurrentTab();
}

/**
 * 篩選器
 */
function initFilters() {
    const thFilter = document.getElementById('thFilter');
    const categorySelect = document.getElementById('categorySelect');
    const troopTypeSelect = document.getElementById('troopTypeSelect');
    const searchInput = document.getElementById('searchInput');
    
    // 防抖搜尋
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderCurrentTab();
        }, 300);
    });
    
    thFilter.addEventListener('change', renderCurrentTab);
    categorySelect.addEventListener('change', renderCurrentTab);
    troopTypeSelect.addEventListener('change', renderCurrentTab);
}

function getFilters() {
    return {
        th: document.getElementById('thFilter').value,
        category: document.getElementById('categorySelect').value,
        troopType: document.getElementById('troopTypeSelect').value,
        search: document.getElementById('searchInput').value.toLowerCase().trim()
    };
}

/**
 * 載入資料 - 從多個 JSON 檔案載入
 */
async function loadData() {
    try {
        // 計算基礎路徑
        const basePath = UPGRADE_DATA_URL.replace('upgrade_data.json', '');
        
        // 並行載入所有資料檔案
        const [buildingsRes, heroesRes, troopsRes, spellsRes] = await Promise.all([
            fetch(basePath + 'buildings.json'),
            fetch(basePath + 'heroes.json'),
            fetch(basePath + 'troops.json'),
            fetch(basePath + 'spells.json')
        ]);
        
        const [buildingsData, heroesData, troopsData, spellsData] = await Promise.all([
            buildingsRes.json(),
            heroesRes.json(),
            troopsRes.json(),
            spellsRes.json()
        ]);
        
        // 合併資料
        upgradeData = {
            building_categories: buildingsData.building_categories,
            buildings: buildingsData.buildings,
            heroes: heroesData.heroes,
            troop_types: troopsData.troop_types,
            troops: troopsData.troops,
            spells: spellsData.spells
        };
        
        // 動態載入分類選項
        populateCategories();
        
        renderCurrentTab();
        updateSummaryDashboard();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('無法載入資料，請稍後再試');
    }
}

/**
 * 填充分類下拉選單
 */
function populateCategories() {
    // 建築類別
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect && upgradeData.building_categories) {
        categorySelect.innerHTML = '<option value="">全部類別</option>';
        upgradeData.building_categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        });
    }
    
    // 兵種類別
    const troopTypeSelect = document.getElementById('troopTypeSelect');
    if (troopTypeSelect && upgradeData.troop_types) {
        troopTypeSelect.innerHTML = '<option value="">全部類別</option>';
        upgradeData.troop_types.forEach(type => {
            troopTypeSelect.innerHTML += `<option value="${type.id}">${type.icon} ${type.name}</option>`;
        });
    }
}

/**
 * 自動刷新
 */
function startAutoRefresh() {
    // 每 30 秒刷新一次
    refreshInterval = setInterval(() => {
        loadData();
    }, 30000);
}

/**
 * 渲染當前分頁
 */
function renderCurrentTab() {
    if (!upgradeData) return;
    
    switch (currentTab) {
        case 'buildings':
            renderBuildings();
            break;
        case 'heroes':
            renderHeroes();
            break;
        case 'troops':
            renderTroops();
            break;
    }
}

/**
 * 渲染建築
 */
function renderBuildings() {
    const grid = document.getElementById('buildings-grid');
    const filters = getFilters();
    
    let buildings = upgradeData.buildings || [];
    
    // 篩選
    if (filters.category) {
        buildings = buildings.filter(b => b.category_id == filters.category);
    }
    if (filters.search) {
        buildings = buildings.filter(b => 
            b.name.toLowerCase().includes(filters.search) ||
            b.name_en.toLowerCase().includes(filters.search)
        );
    }
    if (filters.th) {
        buildings = buildings.filter(b => {
            const levels = b.levels.filter(l => l.th_required <= parseInt(filters.th));
            return levels.length > 0;
        });
    }
    
    if (buildings.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏗️</div>
                <p class="empty-state-text">找不到符合條件的建築</p>
            </div>
        `;
        return;
    }
    
    const { total: disc } = getDiscountSettings();
    grid.innerHTML = buildings.map(building => {
        const maxLevel = filters.th 
            ? Math.max(...building.levels.filter(l => l.th_required <= parseInt(filters.th)).map(l => l.level))
            : building.max_level;
        const topLevel = building.levels.find(l => l.level === maxLevel) || building.levels[building.levels.length - 1];
        
        const costHtml = disc > 0 ? formatWithDiscount(getCostValue(topLevel), disc, formatNumber) : formatCost(topLevel);
        const timeHtml = disc > 0 ? formatWithDiscount(topLevel.build_time, disc, formatTime) : formatTime(topLevel.build_time);
        
        return `
            <div class="item-card" onclick="showBuildingDetails(${building.id})">
                <div class="item-card-header">
                    <div class="item-icon">${getBuildingIcon(building.category_id)}</div>
                    <div class="item-info">
                        <div class="item-name">${building.name}</div>
                        <div class="item-subtitle">${building.name_en}</div>
                    </div>
                </div>
                <div class="item-stats">
                    <div class="stat">
                        <span class="stat-label">最高等級</span>
                        <span class="stat-value">Lv.${maxLevel}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">升級費用</span>
                        <span class="stat-value">${costHtml}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">升級時間</span>
                        <span class="stat-value">${timeHtml}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 渲染英雄
 */
function renderHeroes() {
    const grid = document.getElementById('heroes-grid');
    const filters = getFilters();
    
    let heroes = upgradeData.heroes || [];
    
    // 篩選
    if (filters.search) {
        heroes = heroes.filter(h => 
            h.name.toLowerCase().includes(filters.search) ||
            h.name_en.toLowerCase().includes(filters.search)
        );
    }
    if (filters.th) {
        heroes = heroes.filter(h => h.unlock_th <= parseInt(filters.th));
    }
    
    if (heroes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👑</div>
                <p class="empty-state-text">找不到符合條件的英雄</p>
            </div>
        `;
        return;
    }
    
    const { total: disc } = getDiscountSettings();
    grid.innerHTML = heroes.map(hero => {
        const maxLevel = filters.th 
            ? Math.max(...hero.levels.filter(l => l.th_required <= parseInt(filters.th)).map(l => l.level))
            : hero.max_level;
        const topLevel = hero.levels.find(l => l.level === maxLevel) || hero.levels[hero.levels.length - 1];
        
        const costHtml = disc > 0 ? formatWithDiscount(topLevel.dark_elixir_cost, disc, formatNumber) : formatNumber(topLevel.dark_elixir_cost);
        
        return `
            <div class="item-card" onclick="showHeroDetails(${hero.id})">
                <div class="item-card-header">
                    <div class="item-icon">${getHeroIcon(hero.name)}</div>
                    <div class="item-info">
                        <div class="item-name">${hero.name}</div>
                        <div class="item-subtitle">${hero.name_en}</div>
                    </div>
                </div>
                <div class="item-stats">
                    <div class="stat">
                        <span class="stat-label">最高等級</span>
                        <span class="stat-value">Lv.${maxLevel}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">暗黑聖水</span>
                        <span class="stat-value">${costHtml}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">DPS</span>
                        <span class="stat-value">${topLevel.dps}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 渲染兵種
 */
function renderTroops() {
    const grid = document.getElementById('troops-grid');
    const filters = getFilters();
    
    let troops = upgradeData.troops || [];
    
    // 篩選
    if (filters.troopType) {
        troops = troops.filter(t => t.type_id == filters.troopType);
    }
    if (filters.search) {
        troops = troops.filter(t => 
            t.name.toLowerCase().includes(filters.search) ||
            t.name_en.toLowerCase().includes(filters.search)
        );
    }
    if (filters.th) {
        troops = troops.filter(t => {
            const levels = t.levels.filter(l => l.lab_required <= parseInt(filters.th));
            return levels.length > 0;
        });
    }
    
    if (troops.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚔️</div>
                <p class="empty-state-text">找不到符合條件的兵種</p>
            </div>
        `;
        return;
    }
    
    const { total: disc } = getDiscountSettings();
    grid.innerHTML = troops.map(troop => {
        const maxLevel = filters.th 
            ? Math.max(...troop.levels.filter(l => l.lab_required <= parseInt(filters.th)).map(l => l.level))
            : troop.max_level;
        const topLevel = troop.levels.find(l => l.level === maxLevel) || troop.levels[troop.levels.length - 1];
        
        const costVal = topLevel.elixir_cost || topLevel.dark_elixir_cost || 0;
        const costHtml = disc > 0 ? formatWithDiscount(costVal, disc, formatNumber) : formatNumber(costVal);
        
        return `
            <div class="item-card" onclick="showTroopDetails(${troop.id})">
                <div class="item-card-header">
                    <div class="item-icon">${getTroopIcon(troop.type_id)}</div>
                    <div class="item-info">
                        <div class="item-name">${troop.name}</div>
                        <div class="item-subtitle">${troop.name_en}</div>
                    </div>
                </div>
                <div class="item-stats">
                    <div class="stat">
                        <span class="stat-label">最高等級</span>
                        <span class="stat-value">Lv.${maxLevel}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">升級費用</span>
                        <span class="stat-value">${costHtml}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">DPS</span>
                        <span class="stat-value">${topLevel.dps}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 彈窗功能
 */
function initModal() {
    const modal = document.getElementById('levelModal');
    const closeBtn = document.getElementById('modalClose');
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function showModal() {
    document.getElementById('levelModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('levelModal').classList.remove('active');
    document.body.style.overflow = '';
}

function showBuildingDetails(id) {
    const building = upgradeData.buildings.find(b => b.id === id);
    if (!building) return;
    
    const filters = getFilters();
    let levels = building.levels;
    if (filters.th) {
        levels = levels.filter(l => l.th_required <= parseInt(filters.th));
    }
    
    document.getElementById('modalIcon').textContent = getBuildingIcon(building.category_id);
    document.getElementById('modalTitle').textContent = `${building.name} (${building.name_en})`;
    
    const header = document.getElementById('tableHeader');
    header.innerHTML = `
        <th>等級</th>
        <th>金幣</th>
        <th>聖水</th>
        <th>暗黑聖水</th>
        <th>升級時間</th>
        <th>大本需求</th>
        <th>HP</th>
        <th>DPS</th>
    `;
    
    const { total: disc } = getDiscountSettings();
    const body = document.getElementById('tableBody');
    body.innerHTML = levels.map(level => `
        <tr>
            <td class="level-num">${level.level}</td>
            <td class="cost-gold">${level.gold_cost ? (disc > 0 ? formatWithDiscount(level.gold_cost, disc, formatNumber) : formatNumber(level.gold_cost)) : '-'}</td>
            <td class="cost-elixir">${level.elixir_cost ? (disc > 0 ? formatWithDiscount(level.elixir_cost, disc, formatNumber) : formatNumber(level.elixir_cost)) : '-'}</td>
            <td class="cost-dark">${level.dark_elixir_cost ? (disc > 0 ? formatWithDiscount(level.dark_elixir_cost, disc, formatNumber) : formatNumber(level.dark_elixir_cost)) : '-'}</td>
            <td class="time">${disc > 0 ? formatWithDiscount(level.build_time, disc, formatTime) : formatTime(level.build_time)}</td>
            <td>TH${level.th_required}</td>
            <td>${formatNumber(level.hp)}</td>
            <td>${level.dps || '-'}</td>
        </tr>
    `).join('');
    
    showModal();
}

function showHeroDetails(id) {
    const hero = upgradeData.heroes.find(h => h.id === id);
    if (!hero) return;
    
    const filters = getFilters();
    let levels = hero.levels;
    if (filters.th) {
        levels = levels.filter(l => l.th_required <= parseInt(filters.th));
    }
    
    document.getElementById('modalIcon').textContent = getHeroIcon(hero.name);
    document.getElementById('modalTitle').textContent = `${hero.name} (${hero.name_en})`;
    
    const header = document.getElementById('tableHeader');
    header.innerHTML = `
        <th>等級</th>
        <th>暗黑聖水</th>
        <th>升級時間</th>
        <th>大本需求</th>
        <th>HP</th>
        <th>DPS</th>
        <th>技能傷害</th>
    `;
    
    const { total: disc } = getDiscountSettings();
    const body = document.getElementById('tableBody');
    body.innerHTML = levels.map(level => `
        <tr>
            <td class="level-num">${level.level}</td>
            <td class="cost-dark">${disc > 0 ? formatWithDiscount(level.dark_elixir_cost, disc, formatNumber) : formatNumber(level.dark_elixir_cost)}</td>
            <td class="time">${disc > 0 ? formatWithDiscount(level.upgrade_time, disc, formatTime) : formatTime(level.upgrade_time)}</td>
            <td>TH${level.th_required}</td>
            <td>${formatNumber(level.hp)}</td>
            <td>${level.dps}</td>
            <td>${level.ability_damage || '-'}</td>
        </tr>
    `).join('');
    
    showModal();
}

function showTroopDetails(id) {
    const troop = upgradeData.troops.find(t => t.id === id);
    if (!troop) return;
    
    const filters = getFilters();
    let levels = troop.levels;
    if (filters.th) {
        levels = levels.filter(l => l.lab_required <= parseInt(filters.th));
    }
    
    document.getElementById('modalIcon').textContent = getTroopIcon(troop.type_id);
    document.getElementById('modalTitle').textContent = `${troop.name} (${troop.name_en})`;
    
    const header = document.getElementById('tableHeader');
    header.innerHTML = `
        <th>等級</th>
        <th>聖水</th>
        <th>暗黑聖水</th>
        <th>升級時間</th>
        <th>實驗室</th>
        <th>DPS</th>
        <th>HP</th>
    `;
    
    const { total: disc } = getDiscountSettings();
    const body = document.getElementById('tableBody');
    body.innerHTML = levels.map(level => `
        <tr>
            <td class="level-num">${level.level}</td>
            <td class="cost-elixir">${level.elixir_cost ? (disc > 0 ? formatWithDiscount(level.elixir_cost, disc, formatNumber) : formatNumber(level.elixir_cost)) : '-'}</td>
            <td class="cost-dark">${level.dark_elixir_cost ? (disc > 0 ? formatWithDiscount(level.dark_elixir_cost, disc, formatNumber) : formatNumber(level.dark_elixir_cost)) : '-'}</td>
            <td class="time">${disc > 0 ? formatWithDiscount(level.upgrade_time, disc, formatTime) : formatTime(level.upgrade_time)}</td>
            <td>Lv.${level.lab_required}</td>
            <td>${level.dps || '-'}</td>
            <td>${formatNumber(level.hp)}</td>
        </tr>
    `).join('');
    
    showModal();
}

/**
 * 返回頂部
 */
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }, { passive: true });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/**
 * 輔助函數
 */
function getBuildingIcon(categoryId) {
    const icons = { 1: '🛡️', 2: '💰', 3: '⚔️', 4: '🏠' };
    return icons[categoryId] || '🏠';
}

function getHeroIcon(name) {
    const icons = {
        '蠻王': '👑',
        '弓箭女皇': '👸',
        '大乾爹': '🧙',
        '皇家鬥士': '⚔️'
    };
    return icons[name] || '👤';
}

function getTroopIcon(typeId) {
    const icons = { 1: '💧', 2: '⚫', 3: '✨', 4: '🏰' };
    return icons[typeId] || '⚔️';
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toLocaleString();
}

function formatTime(seconds) {
    if (!seconds || seconds === 0) return '即時';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return hours > 0 ? `${days}天${hours}時` : `${days}天`;
    } else if (hours > 0) {
        return minutes > 0 ? `${hours}時${minutes}分` : `${hours}時`;
    } else if (minutes > 0) {
        return `${minutes}分`;
    } else {
        return `${seconds}秒`;
    }
}

function getCostValue(level) {
    return level.gold_cost || level.elixir_cost || level.dark_elixir_cost || 0;
}

function formatCost(level) {
    if (level.gold_cost) return formatNumber(level.gold_cost) + ' 金';
    if (level.elixir_cost) return formatNumber(level.elixir_cost) + ' 聖';
    if (level.dark_elixir_cost) return formatNumber(level.dark_elixir_cost) + ' 暗';
    return '-';
}

function showError(message) {
    const grids = document.querySelectorAll('.items-grid');
    grids.forEach(grid => {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p class="empty-state-text">${message}</p>
            </div>
        `;
    });
}
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p class="empty-state-text">${message}</p>
            </div>
        `;
    });
}
