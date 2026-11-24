/*
 * 第六工人（B.O.B）資源計算
 *
 * 資料來源：sixth_builder_data.js（每週由 Clash of Clans Fandom Wiki 自動更新）。
 * B.O.B Control 升級條件中，與夜世界建築有關的部分（以 2026-11 的 Wiki 為例）：
 *   - Gear Up 需要：雙管加農砲 Lv4、箭塔 Lv6、多管迫擊砲 Lv8
 *   - 任一兵種升到 Lv18：需要星空實驗室 Lv9；以 Night Witch 為例需要訓練營 Lv8
 *   - 任一防禦建築升到 Lv9：以多管迫擊砲為例（同時滿足 Lv8 的條件）
 * 金庫／聖水瓶：Builder Hall 加上兩座倉庫的容量，要能容納單次最高的升級費用。
 * Builder Hall 低於 9：當作剛升上 Lv9，還沒蓋 Lv9 的新建築（B.O.B Control）。
 * 假設玩家目前沒有任何資源。
 * 未計入：兵種研究費用、英雄等級（合計 45 級）、主世界的 Gear Up 費用、Builder Hall 升級費用。
 */
(function (root) {
    'use strict';

    var GOLD = 'gold';
    var ELIXIR = 'elixir';
    var RESOURCE_NAMES = { gold: '金幣', elixir: '聖水' };

    // 費用與條件等級來自自動產生的 sixth_builder_data.js（scripts/update_sixth_builder_data.py）
    var DATA = (typeof module !== 'undefined' && module.exports)
        ? require('./sixth_builder_data.js')
        : root.SixthBuilderData;
    var REQ = DATA.bob_control;

    // costs[i] = 由 Lv i 升到 Lv i+1 的費用（costs[0] 為建造 Lv1 的費用）
    var BUILDINGS = [
        {
            key: 'double_cannon', name: '雙管加農砲', resource: GOLD, min: 0,
            target: REQ.double_cannon,
            reason: 'Gear Up 加農砲',
        },
        {
            key: 'archer_tower', name: '箭塔', resource: GOLD, min: 0,
            target: REQ.archer_tower,
            reason: 'Gear Up 箭塔',
        },
        {
            key: 'multi_mortar', name: '多管迫擊砲', resource: GOLD, min: 0,
            target: Math.max(REQ.multi_mortar, REQ.defense_level),
            reason: 'Gear Up 迫擊砲（Lv' + REQ.multi_mortar + '）＋ 任一防禦建築 Lv' + REQ.defense_level,
        },
        {
            key: 'star_laboratory', name: '星空實驗室', resource: ELIXIR, min: 1,
            target: REQ.star_laboratory,
            reason: '任一兵種研究到 Lv' + REQ.troop_level,
        },
        {
            key: 'builder_barracks', name: '訓練營', resource: ELIXIR, min: 1,
            target: DATA.night_witch_barracks,
            reason: '解鎖 Night Witch（用來研究到 Lv' + REQ.troop_level + '）',
        },
    ];
    BUILDINGS.forEach(function (b) {
        b.costs = DATA.buildings[b.key];
        b.max = b.costs.length;
    });

    // 金庫與聖水瓶的每級容量與升級費用（兩者數值相同，付款資源相反）
    var STORAGE_CAPACITY = DATA.storages.gold_storage.capacity;
    var STORAGE_COSTS = DATA.storages.gold_storage.costs;
    var STORAGE_MAX_LEVEL = STORAGE_CAPACITY.length;

    var STORAGES = {
        // stores：儲存的資源；resource：升級要付的資源
        gold: { key: 'gold_storage', name: '金庫', stores: GOLD, resource: ELIXIR },
        elixir: { key: 'elixir_storage', name: '聖水瓶', stores: ELIXIR, resource: GOLD },
    };

    var REQUIRED_BUILDER_HALL = REQ.builder_hall;
    var BUILDER_HALL_MAX_LEVEL = Math.max.apply(null, Object.keys(DATA.builder_hall_capacity).map(Number));
    var BOB_CONTROL_COST = REQ.build_cost; // 建造 B.O.B Control（金幣）

    function builderHallCapacity(level) {
        return DATA.builder_hall_capacity[String(level)];
    }

    function sum(list) {
        return list.reduce(function (a, b) { return a + b; }, 0);
    }

    function maxOf(list) {
        return list.length ? Math.max.apply(null, list) : 0;
    }

    /** 由 current 升到 target 的總費用；已達標回傳 0 */
    function upgradeCost(costs, current, target) {
        return current >= target ? 0 : sum(costs.slice(current, target));
    }

    function maxSingleCost(costs, current, target) {
        return current >= target ? 0 : maxOf(costs.slice(current, target));
    }

    function storageCapacity(level) {
        return level > 0 ? STORAGE_CAPACITY[level - 1] : 0;
    }

    function totalCapacity(levels, hallCapacity) {
        return hallCapacity + sum(levels.map(storageCapacity));
    }

    /** 每次升級等級最低的一座，直到總容量 >= need。回傳 { levels, ok } */
    function planStorages(levels, need, maxLevel, hallCapacity) {
        levels = levels.slice();
        while (totalCapacity(levels, hallCapacity) < need) {
            var i = levels.indexOf(Math.min.apply(null, levels));
            if (levels[i] >= maxLevel) {
                return { levels: levels, ok: false };
            }
            levels[i] += 1;
        }
        return { levels: levels, ok: true };
    }

    /** 小時數 → 「X 天 Y 小時 Z 分」 */
    function formatHours(hours) {
        var totalMinutes = Math.ceil(Math.round(hours * 60 * 1e6) / 1e6);
        var days = Math.floor(totalMinutes / 1440);
        var hrs = Math.floor((totalMinutes % 1440) / 60);
        var mins = totalMinutes % 60;
        var parts = [];
        if (days) parts.push(days + ' 天');
        if (hrs) parts.push(hrs + ' 小時');
        if (mins || !parts.length) parts.push(mins + ' 分');
        return parts.join(' ');
    }

    function formatNumber(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function buildingItems(data, bobControlBuilt) {
        var items = [];
        if (!bobControlBuilt) {
            items.push({
                key: 'bob_control', name: 'B.O.B Control（建造）', resource: GOLD,
                current: 0, target: 1, reason: '需要 Builder Hall Lv' + REQUIRED_BUILDER_HALL,
                cost: BOB_CONTROL_COST, maxSingle: BOB_CONTROL_COST,
            });
        }
        BUILDINGS.forEach(function (b) {
            var current = data[b.key];
            items.push({
                key: b.key, name: b.name, resource: b.resource,
                current: current, target: Math.max(current, b.target), reason: b.reason,
                cost: upgradeCost(b.costs, current, b.target),
                maxSingle: maxSingleCost(b.costs, current, b.target),
            });
        });
        return items;
    }

    /*
     * 依單次最高費用決定兩種倉庫要升到幾級。
     * 金庫升級付聖水、聖水瓶升級付金幣，所以重複計算到結果不再變動。
     */
    function storageItems(data, items, maxLevel, hallCapacity) {
        var baseMax = {};
        var current = {};
        [GOLD, ELIXIR].forEach(function (res) {
            baseMax[res] = maxOf(items.filter(function (i) { return i.resource === res; })
                .map(function (i) { return i.maxSingle; }));
            var key = STORAGES[res].key;
            current[res] = [data[key + '_1'], data[key + '_2']];
        });

        var need = { gold: baseMax.gold, elixir: baseMax.elixir };
        var plans;
        for (var round = 0; round < 5; round++) {
            plans = {
                gold: planStorages(current.gold, need.gold, maxLevel, hallCapacity),
                elixir: planStorages(current.elixir, need.elixir, maxLevel, hallCapacity),
            };
            var newNeed = { gold: baseMax.gold, elixir: baseMax.elixir };
            [GOLD, ELIXIR].forEach(function (res) {
                var pay = STORAGES[res].resource;
                current[res].forEach(function (cur, idx) {
                    var single = maxSingleCost(STORAGE_COSTS, cur, plans[res].levels[idx]);
                    newNeed[pay] = Math.max(newNeed[pay], single);
                });
            });
            if (newNeed.gold === need.gold && newNeed.elixir === need.elixir) break;
            need = newNeed;
        }

        var result = [];
        [GOLD, ELIXIR].forEach(function (res) {
            var s = STORAGES[res];
            current[res].forEach(function (cur, idx) {
                var tgt = plans[res].levels[idx];
                result.push({
                    key: s.key + '_' + (idx + 1), name: s.name + ' ' + (idx + 1), resource: s.resource,
                    current: cur, target: tgt,
                    reason: '容量需容納單次最高' + RESOURCE_NAMES[res] + '費用 ' + formatNumber(need[res]),
                    cost: upgradeCost(STORAGE_COSTS, cur, tgt),
                    maxSingle: maxSingleCost(STORAGE_COSTS, cur, tgt),
                });
            });
        });
        return {
            items: result,
            need: need,
            capacityOk: { gold: plans.gold.ok, elixir: plans.elixir.ok },
        };
    }

    function resourceSummary(resource, items, rate, maxSingle, capacityOk) {
        var total = sum(items.filter(function (i) { return i.resource === resource; })
            .map(function (i) { return i.cost; }));
        var hours, timeText;
        if (total === 0) {
            hours = 0;
            timeText = '不需要';
        } else if (rate > 0) {
            hours = total / rate;
            timeText = formatHours(hours);
        } else {
            hours = null;
            timeText = '每小時產量為 0，無法估算';
        }
        return {
            resource: resource,
            name: RESOURCE_NAMES[resource],
            storageName: STORAGES[resource].name,
            shortage: total,
            rate: rate,
            hours: hours,
            timeText: timeText,
            maxSingle: maxSingle,
            capacityOk: capacityOk,
        };
    }

    /**
     * data：builder_hall、各建築 key 的目前等級、gold_storage_1/2、elixir_storage_1/2、
     *       bob_control_built、gold_rate、elixir_rate
     */
    function calculate(data) {
        var bh = data.builder_hall;
        var assumedBuilderHall = bh < REQUIRED_BUILDER_HALL;
        var effectiveBh = assumedBuilderHall ? REQUIRED_BUILDER_HALL : bh;
        var bobControlBuilt = Boolean(data.bob_control_built) && !assumedBuilderHall;
        // 倉庫最高等級：Lv n 需要 Builder Hall n
        var maxStorageLevel = Math.min(effectiveBh, STORAGE_MAX_LEVEL);
        var hallCapacity = builderHallCapacity(effectiveBh);

        var items = buildingItems(data, bobControlBuilt);
        var storage = storageItems(data, items, maxStorageLevel, hallCapacity);
        items = items.concat(storage.items);
        items.forEach(function (item) {
            item.resourceName = RESOURCE_NAMES[item.resource];
            item.done = item.cost === 0;
        });

        var gold = resourceSummary(GOLD, items, data.gold_rate, storage.need.gold, storage.capacityOk.gold);
        var elixir = resourceSummary(ELIXIR, items, data.elixir_rate, storage.need.elixir, storage.capacityOk.elixir);

        var overallText;
        if (gold.hours === null || elixir.hours === null) {
            overallText = '無法估算（有資源每小時產量為 0）';
        } else {
            var longest = Math.max(gold.hours, elixir.hours);
            overallText = longest === 0 ? '不需要' : formatHours(longest);
        }

        return {
            items: items,
            gold: gold,
            elixir: elixir,
            overallText: overallText,
            maxStorageLevel: maxStorageLevel,
            builderHallCapacity: hallCapacity,
            builderHall: bh,
            assumedBuilderHall: assumedBuilderHall,
        };
    }

    var api = {
        DATA: DATA,
        BUILDINGS: BUILDINGS,
        STORAGE_CAPACITY: STORAGE_CAPACITY,
        STORAGE_COSTS: STORAGE_COSTS,
        STORAGE_MAX_LEVEL: STORAGE_MAX_LEVEL,
        BOB_CONTROL_COST: BOB_CONTROL_COST,
        REQUIRED_BUILDER_HALL: REQUIRED_BUILDER_HALL,
        BUILDER_HALL_MAX_LEVEL: BUILDER_HALL_MAX_LEVEL,
        builderHallCapacity: builderHallCapacity,
        upgradeCost: upgradeCost,
        planStorages: planStorages,
        formatHours: formatHours,
        formatNumber: formatNumber,
        calculate: calculate,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.SixthBuilderCalc = api;
    }
})(this);
