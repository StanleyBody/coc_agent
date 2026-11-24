/*
 * 此檔由 scripts/update_sixth_builder_data.py 自動產生，請勿手動修改。
 * 資料來源：Clash of Clans Fandom Wiki（https://clashofclans.fandom.com）
 */
(function (root) {
    'use strict';
    var data = {
  "buildings": {
    "double_cannon": [
      20000,
      50000,
      80000,
      300000,
      900000,
      1400000,
      2200000,
      3200000,
      4200000,
      5200000
    ],
    "archer_tower": [
      12000,
      30000,
      60000,
      250000,
      800000,
      1200000,
      2000000,
      2800000,
      3600000,
      4600000
    ],
    "multi_mortar": [
      600000,
      700000,
      800000,
      1000000,
      1200000,
      1600000,
      2500000,
      3500000,
      4500000,
      5500000
    ],
    "star_laboratory": [
      1000,
      15000,
      50000,
      300000,
      700000,
      1000000,
      2000000,
      3000000,
      4000000,
      5000000
    ],
    "builder_barracks": [
      1000,
      4000,
      10000,
      25000,
      100000,
      150000,
      300000,
      500000,
      1000000,
      1500000,
      2000000,
      3000000
    ]
  },
  "storages": {
    "gold_storage": {
      "capacity": [
        70000,
        150000,
        250000,
        350000,
        600000,
        800000,
        1200000,
        1600000,
        2000000,
        2500000
      ],
      "costs": [
        20000,
        80000,
        200000,
        300000,
        600000,
        1000000,
        1500000,
        2000000,
        2500000,
        3200000
      ]
    },
    "elixir_storage": {
      "capacity": [
        70000,
        150000,
        250000,
        350000,
        600000,
        800000,
        1200000,
        1600000,
        2000000,
        2500000
      ],
      "costs": [
        20000,
        80000,
        200000,
        300000,
        600000,
        1000000,
        1500000,
        2000000,
        2500000,
        3200000
      ]
    }
  },
  "builder_hall_capacity": {
    "1": 50000,
    "2": 75000,
    "3": 100000,
    "4": 150000,
    "5": 900000,
    "6": 900000,
    "7": 1100000,
    "8": 1300000,
    "9": 1500000,
    "10": 1500000
  },
  "bob_control": {
    "build_cost": 100000,
    "builder_hall": 9,
    "double_cannon": 4,
    "archer_tower": 6,
    "multi_mortar": 8,
    "troop_level": 18,
    "star_laboratory": 9,
    "defense_level": 9
  },
  "night_witch_barracks": 8
};
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = data;
    } else {
        root.SixthBuilderData = data;
    }
})(this);
