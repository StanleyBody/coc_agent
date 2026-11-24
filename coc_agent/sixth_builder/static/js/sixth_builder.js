/*
 * 第六工人計算機畫面
 * 需先載入 sixth_builder_calc.js；畫面產生在 #sixth-builder-app 內。
 * 欄位值會同步到網址參數，方便分享。
 */
(function () {
    'use strict';

    var Calc = window.SixthBuilderCalc;
    var fmt = Calc.formatNumber;

    var buildingFields = Calc.BUILDINGS.map(function (b) {
        return { key: b.key, label: b.name, min: b.min, max: b.max };
    });

    var STORAGE_MAX = Calc.STORAGE_MAX_LEVEL;
    var MACHINE = Calc.HEROES[0];
    var COPTER = Calc.HEROES[1];

    // unlockMin：0 表示未解鎖，其餘須介於 unlockMin 與 max 之間
    var unitFields = [
        { key: 'night_witch', label: 'Night Witch', min: 0, max: Calc.NIGHT_WITCH_MAX_LEVEL,
            unlockMin: Calc.NIGHT_WITCH.first_level },
        { key: MACHINE.key, label: MACHINE.name, min: 0, max: MACHINE.maxLevel,
            unlockMin: MACHINE.firstLevel },
        { key: COPTER.key, label: COPTER.name, min: 0, max: COPTER.maxLevel,
            unlockMin: COPTER.firstLevel },
    ];
    var FIELDS = [{ key: 'builder_hall', label: 'Builder Hall', min: 1, max: Calc.BUILDER_HALL_MAX_LEVEL }]
        .concat(buildingFields)
        .concat(unitFields)
        .concat([
            { key: 'gold_storage_1', label: '金庫 1', min: 0, max: STORAGE_MAX },
            { key: 'gold_storage_2', label: '金庫 2', min: 0, max: STORAGE_MAX },
            { key: 'elixir_storage_1', label: '聖水瓶 1', min: 0, max: STORAGE_MAX },
            { key: 'elixir_storage_2', label: '聖水瓶 2', min: 0, max: STORAGE_MAX },
            { key: 'gold_rate', label: '每小時金幣產量', min: 0, max: null },
            { key: 'elixir_rate', label: '每小時聖水產量', min: 0, max: null },
        ]);

    function input(f) {
        var range = 'min="' + f.min + '"' + (f.max !== null ? ' max="' + f.max + '"' : '');
        return '<input type="number" class="sb-input" id="sb-' + f.key + '" name="' + f.key + '" ' +
            range + ' step="1" inputmode="numeric" aria-label="' + f.label + '">';
    }

    function field(f) {
        return '<div class="sb-field" data-field="' + f.key + '">' +
            '<label for="sb-' + f.key + '">' + f.label + '</label>' + input(f) +
            '<span class="sb-error" hidden></span></div>';
    }

    function pair(label, a, b) {
        var fa = FIELDS.find(function (f) { return f.key === a; });
        var fb = FIELDS.find(function (f) { return f.key === b; });
        return '<div class="sb-field" data-field="' + a + ' ' + b + '">' +
            '<label for="sb-' + a + '">' + label + '</label>' +
            '<div class="sb-pair">' + input(fa) + '<span>／</span>' + input(fb) + '</div>' +
            '<span class="sb-error" hidden></span></div>';
    }

    function byKey(key) {
        return FIELDS.find(function (f) { return f.key === key; });
    }

    function formHtml() {
        return '<form class="sb-card sb-form" novalidate>' +
            '<fieldset><legend>夜世界</legend><div class="sb-grid sb-grid-3">' + field(byKey('builder_hall')) +
            '<label class="sb-check sb-span-2"><input type="checkbox" id="sb-bob_control_built" name="bob_control_built"> 已建造 B.O.B Control</label>' +
            '</div></fieldset>' +
            '<fieldset><legend>建築目前等級</legend><div class="sb-grid sb-grid-3">' +
            buildingFields.map(field).join('') + '</div></fieldset>' +
            '<fieldset><legend>兵種與英雄等級（未解鎖填 0）</legend><div class="sb-grid sb-grid-3">' +
            unitFields.map(field).join('') + '</div></fieldset>' +
            '<fieldset><legend>倉庫等級（第 1 座 ／ 第 2 座）</legend><div class="sb-grid sb-grid-pairs">' +
            pair('金庫', 'gold_storage_1', 'gold_storage_2') +
            pair('聖水瓶', 'elixir_storage_1', 'elixir_storage_2') +
            '</div></fieldset>' +
            '<fieldset><legend>採集器產量</legend><div class="sb-grid">' +
            field(byKey('gold_rate')) + field(byKey('elixir_rate')) + '</div></fieldset>' +
            '</form>';
    }

    function notesHtml() {
        var req = Calc.DATA.bob_control;
        var bh = Calc.REQUIRED_BUILDER_HALL;
        var targets = Calc.BUILDINGS.map(function (b) { return b.name + ' Lv' + b.target; }).join('、');
        return '<div class="sb-notes"><h4>計算說明</h4><ul>' +
            '<li>目標等級依 B.O.B Control 升級條件：' + targets + '（訓練營為解鎖 Night Witch 的等級）。</li>' +
            '<li>假設目前沒有任何資源。金庫／聖水瓶會升到 Builder Hall（' + fmt(Calc.builderHallCapacity(bh)) +
            '）加兩座倉庫的容量足以容納單次最高費用，優先升級等級較低的一座。</li>' +
            '<li>Builder Hall 低於 ' + bh + ' 時，以剛升上 Lv' + bh + '、尚未建造 B.O.B Control 計算（不含 Builder Hall 升級費用）。</li>' +
            '<li>兵種以 Night Witch 研究到 Lv' + req.troop_level + ' 計算；未解鎖時以解鎖等級 Lv' +
            Calc.NIGHT_WITCH.first_level + ' 起算。</li>' +
            '<li>' + MACHINE.name + '＋' + COPTER.name + '合計 Lv' + req.hero_total +
            '：在 Builder Hall 允許的等級內，取總費用最低的組合（' + COPTER.name + '建造後為 Lv' + COPTER.firstLevel + '）。</li>' +
            '<li>預估時間只計算採集器產量，不含戰鬥獎勵與其他來源。</li>' +
            '<li>資料來源：Clash of Clans Fandom Wiki，每週自動更新。</li>' +
            '</ul></div>';
    }

    /** 尚未填完時顯示的空白資源卡片 */
    function placeholderCard(resource, name) {
        var icon = resource === 'gold' ? '🪙' : '💧';
        return '<div class="sb-res sb-res-' + resource + ' is-placeholder">' +
            '<div class="sb-res-head">' + icon + ' ' + name + '</div><dl>' +
            '<dt>還缺</dt><dd class="sb-num sb-shortage">—</dd>' +
            '<dt>每小時產量</dt><dd class="sb-num">—</dd>' +
            '<dt class="sb-time-label">採集器補足需要</dt><dd class="sb-time">—</dd>' +
            '</dl></div>';
    }

    function resourceCard(r) {
        var icon = r.resource === 'gold' ? '🪙' : '💧';
        var warn = r.capacityOk ? '' :
            '<p class="sb-warn">⚠️ ' + r.storageName + '升到上限仍無法容納單次最高費用 ' + fmt(r.maxSingle) + '。</p>';
        return '<div class="sb-res sb-res-' + r.resource + '">' +
            '<div class="sb-res-head">' + icon + ' ' + r.name + '</div><dl>' +
            '<dt>還缺</dt><dd class="sb-num sb-shortage">' + fmt(r.shortage) + '</dd>' +
            '<dt>每小時產量</dt><dd class="sb-num">' + fmt(r.rate) + '</dd>' +
            '<dt class="sb-time-label">採集器補足需要</dt><dd class="sb-time">' + r.timeText + '</dd>' +
            '</dl>' + warn + '</div>';
    }

    function resultHtml(result) {
        var bhWarn = result.assumedBuilderHall
            ? '<p class="sb-warn">⚠️ 目前 Builder Hall Lv' + result.builderHall +
              '，以剛升上 Lv' + Calc.REQUIRED_BUILDER_HALL + '、尚未建造 Lv' + Calc.REQUIRED_BUILDER_HALL +
              ' 新建築（B.O.B Control）計算，未計入 Builder Hall 升級費用。</p>'
            : '';
        var todo = result.items.filter(function (item) { return !item.done; });
        var done = result.items.filter(function (item) { return item.done; });
        var rows = todo.map(function (item) {
            return '<tr><td>' + item.name + '<span class="sb-item-reason">' + item.reason + '</span></td>' +
                '<td class="sb-level">Lv' + item.current + ' → Lv' + item.target + '</td>' +
                '<td class="sb-num sb-' + item.resource + '">' + fmt(item.cost) + ' ' + item.resourceName + '</td></tr>';
        }).join('');
        var table = todo.length
            ? '<table class="sb-table"><thead><tr><th>項目</th><th>等級</th><th>費用</th></tr></thead>' +
              '<tbody>' + rows + '</tbody></table>'
            : '<p class="sb-empty">所有條件都已達標。</p>';
        var doneLine = done.length && todo.length
            ? '<p class="sb-done">✅ 已達標：' + done.map(function (i) { return i.name; }).join('、') + '</p>'
            : '';
        var heroWarn = result.heroesOk ? '' :
            '<p class="sb-warn">⚠️ 英雄等級上限無法達到合計 Lv' + Calc.DATA.bob_control.hero_total + '，英雄費用未計入。</p>';
        return '<h3 class="sb-result-title">計算結果</h3>' + bhWarn + heroWarn +
            '<div class="sb-summary">' + resourceCard(result.gold) + resourceCard(result.elixir) + '</div>' +
            '<p class="sb-overall">兩種資源都夠所需時間：<strong>' + result.overallText + '</strong></p>' +
            table + doneLine;
    }

    /** 讀取並檢查欄位；回傳 { data, errors } */
    function readForm(form) {
        var data = { bob_control_built: form.elements.bob_control_built.checked };
        var errors = {};
        FIELDS.forEach(function (f) {
            var raw = form.elements[f.key].value.trim();
            if (raw === '') {
                errors[f.key] = '必填';
                return;
            }
            var n = Number(raw);
            if (f.unlockMin && Number.isInteger(n) && n !== 0 && (n < f.unlockMin || n > f.max)) {
                errors[f.key] = '請輸入 0 或 ' + f.unlockMin + '–' + f.max + ' 的整數';
                return;
            }
            if (!Number.isInteger(n) || n < f.min || (f.max !== null && n > f.max)) {
                errors[f.key] = f.max !== null ? '請輸入 ' + f.min + '–' + f.max + ' 的整數' : '請輸入 0 以上的整數';
                return;
            }
            data[f.key] = n;
        });
        return { data: data, errors: errors };
    }

    function showErrors(form, errors) {
        form.querySelectorAll('.sb-field').forEach(function (el) {
            var keys = el.getAttribute('data-field').split(' ');
            var messages = [];
            keys.forEach(function (k) {
                var touched = form.elements[k].dataset.touched === '1';
                var hasError = Boolean(errors[k]) && touched;
                form.elements[k].setAttribute('aria-invalid', hasError ? 'true' : 'false');
                if (hasError) {
                    messages.push((keys.length > 1 ? '第 ' + k.slice(-1) + ' 座：' : '') + errors[k]);
                }
            });
            var span = el.querySelector('.sb-error');
            span.textContent = messages.join('；');
            span.hidden = messages.length === 0;
        });
    }

    function syncUrl(form) {
        var params = new URLSearchParams();
        FIELDS.forEach(function (f) {
            var v = form.elements[f.key].value.trim();
            if (v !== '') params.set(f.key, v);
        });
        if (form.elements.bob_control_built.checked) params.set('bob_control_built', '1');
        var query = params.toString();
        try {
            history.replaceState(null, '', query ? '?' + query : location.pathname);
        } catch (e) { /* 預覽環境可能不允許 */ }
    }

    function loadUrl(form) {
        var params = new URLSearchParams(location.search);
        FIELDS.forEach(function (f) {
            if (params.has(f.key)) {
                form.elements[f.key].value = params.get(f.key);
                form.elements[f.key].dataset.touched = '1';
            }
        });
        form.elements.bob_control_built.checked = params.get('bob_control_built') === '1';
    }

    function init() {
        var app = document.getElementById('sixth-builder-app');
        if (!app) return;
        app.innerHTML = '<div class="sb-layout">' + formHtml() +
            '<section class="sb-card sb-result"><div class="sb-result-body" aria-live="polite"></div></section>' +
            '</div><div class="sb-notes-wrap"><section class="sb-card">' + notesHtml() + '</section></div>';

        var form = app.querySelector('form');
        var body = app.querySelector('.sb-result-body');

        function update() {
            var read = readForm(form);
            showErrors(form, read.errors);
            syncUrl(form);
            if (Object.keys(read.errors).length) {
                body.innerHTML = '<h3 class="sb-result-title">計算結果</h3>' +
                    '<div class="sb-summary">' + placeholderCard('gold', '金幣') + placeholderCard('elixir', '聖水') + '</div>' +
                    '<p class="sb-empty">填完左側所有欄位後會自動計算。</p>';
                return;
            }
            body.innerHTML = resultHtml(Calc.calculate(read.data));
        }

        form.addEventListener('input', function (e) {
            if (e.target.name) e.target.dataset.touched = '1';
            update();
        });
        form.addEventListener('change', update);
        form.addEventListener('submit', function (e) { e.preventDefault(); });

        loadUrl(form);
        update();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
