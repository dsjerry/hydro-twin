/* =============================================
   水利数字孪生 - Mock 数据生成器
   ============================================= */

const MockData = (() => {
  'use strict';

  // --- 水库基础数据（含真实经纬度） ---
  const RESERVOIRS = [
    { id: 'R01', name: '枫树坝水库', lng: 115.42, lat: 24.48, province: '广东', capacity: 19.4, normalLevel: 85.0, warnLevel: 88.0, dangerLevel: 90.5 },
    { id: 'R02', name: '新丰江水库', lng: 114.60, lat: 23.72, province: '广东', capacity: 139.0, normalLevel: 93.0, warnLevel: 95.5, dangerLevel: 97.2 },
    { id: 'R03', name: '白盆珠水库', lng: 115.05, lat: 23.25, province: '广东', capacity: 12.2, normalLevel: 79.0, warnLevel: 82.0, dangerLevel: 84.0 },
    { id: 'R04', name: '鹤地水库', lng: 110.30, lat: 21.63, province: '广东', capacity: 11.5, normalLevel: 72.0, warnLevel: 75.0, dangerLevel: 77.5 },
    { id: 'R05', name: '高州水库', lng: 110.85, lat: 21.93, province: '广东', capacity: 10.3, normalLevel: 89.0, warnLevel: 91.5, dangerLevel: 93.0 },
    { id: 'R06', name: '南水水库', lng: 113.20, lat: 24.82, province: '广东', capacity: 8.7, normalLevel: 77.0, warnLevel: 80.0, dangerLevel: 82.5 },
    { id: 'R07', name: '流溪河水库', lng: 113.77, lat: 23.76, province: '广东', capacity: 3.2, normalLevel: 68.0, warnLevel: 71.0, dangerLevel: 73.0 },
    { id: 'R08', name: '飞来峡水库', lng: 113.18, lat: 23.80, province: '广东', capacity: 5.6, normalLevel: 74.0, warnLevel: 77.0, dangerLevel: 79.0 },
  ];

  // --- 河流数据（含路径坐标） ---
  const RIVERS = [
    { id: 'RV01', name: '东江干流', avgFlow: 680,
      coords: [[115.30,24.70],[115.10,24.20],[114.80,23.80],[114.50,23.40],[114.20,23.10],[113.80,22.90],[113.50,22.75]] },
    { id: 'RV02', name: '北江干流', avgFlow: 520,
      coords: [[113.50,25.00],[113.30,24.50],[113.20,24.00],[113.10,23.60],[112.90,23.30],[112.80,23.05]] },
    { id: 'RV03', name: '西江干流', avgFlow: 2380,
      coords: [[111.80,23.50],[112.00,23.40],[112.30,23.20],[112.60,23.05]] },
    { id: 'RV04', name: '韩江干流', avgFlow: 340,
      coords: [[116.60,24.40],[116.50,24.00],[116.40,23.60],[116.30,23.30],[116.10,23.10]] },
    { id: 'RV05', name: '鉴江干流', avgFlow: 180,
      coords: [[111.00,22.30],[110.80,21.80],[110.55,21.50],[110.35,21.30]] },
  ];

  // --- 水质监测站 ---
  const QUALITY_STATIONS = [
    { id: 'QS01', name: '东江惠州段', lng: 114.40, lat: 23.08, type: '河流' },
    { id: 'QS02', name: '北江清远段', lng: 113.05, lat: 23.70, type: '河流' },
    { id: 'QS03', name: '新丰江库区', lng: 114.60, lat: 23.72, type: '水库' },
    { id: 'QS04', name: '西江肇庆段', lng: 112.45, lat: 23.05, type: '河流' },
    { id: 'QS05', name: '枫树坝库区', lng: 115.42, lat: 24.48, type: '水库' },
    { id: 'QS06', name: '韩江潮州段', lng: 116.63, lat: 23.67, type: '河流' },
  ];

  // --- 告警类型 ---
  const ALERT_TYPES = [
    { level: 'critical', label: '紧急' },
    { level: 'warning', label: '警告' },
    { level: 'info', label: '提示' },
  ];

  const ALERT_TEMPLATES = [
    '[{reservoir}] 水位超过警戒线，当前水位 {level}m',
    '[{reservoir}] 水位超过保证水位，当前水位 {level}m',
    '[{river}] 流量超过警戒流量，当前流量 {flow}m³/s',
    '[{station}] 水质监测数据异常，pH值 {value}',
    '[{reservoir}] 泄洪闸门开启，泄洪流量 {flow}m³/s',
    '[{reservoir}] 大坝位移监测数据异常，偏移量 {value}mm',
    '[{station}] 降雨量达到暴雨级别，24h降雨 {value}mm',
    '[{reservoir}] 库区视频监控信号中断',
    '[{river}] 河道漂浮物监测告警',
  ];

  // --- 工具函数 ---
  function rand(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatTime(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function formatDate(date) {
    const weekdays = ['日','一','二','三','四','五','六'];
    return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 周${weekdays[date.getDay()]}`;
  }

  // --- Mock 数据生成 ---

  /** 生成水库水位数据（带随机波动） */
  function generateWaterLevels() {
    return RESERVOIRS.map(r => {
      const deviation = rand(-2.5, 2.5);
      const level = Math.round((r.normalLevel + deviation) * 10) / 10;
      const capRate = Math.round((level / r.dangerLevel) * 1000) / 10;
      let status = 'normal';
      let statusText = '正常';
      if (level >= r.dangerLevel) { status = 'danger'; statusText = '危险'; }
      else if (level >= r.warnLevel) { status = 'warning'; statusText = '警戒'; }
      else if (level >= r.normalLevel) { status = 'high'; statusText = '偏高'; }
      return {
        name: r.name,
        level: level,
        normalLevel: r.normalLevel,
        warnLevel: r.warnLevel,
        dangerLevel: r.dangerLevel,
        capacity: r.capacity,
        capRate: capRate,
        status: status,
        statusText: statusText,
      };
    });
  }

  /** 生成雨量趋势（近7天） */
  function generateRainfallTrend() {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({
        date: `${pad(d.getMonth()+1)}/${pad(d.getDate())}`,
        rainfall: rand(0, 80),
        days: rand(0, 5),
      });
    }
    return data;
  }

  /** 生成河道流量数据 */
  function generateFlowData() {
    return RIVERS.map(r => ({
      name: r.name,
      flow: Math.round((r.avgFlow + rand(-150, 200)) * 10) / 10,
      avgFlow: r.avgFlow,
      maxFlow: Math.round(r.avgFlow * 1.8),
      unit: 'm³/s',
    }));
  }

  /** 生成设备运行状态 */
  function generateDeviceStatus() {
    return {
      categories: ['闸门', '泵站', '水电站', '水质站', '雨量站', '视频监控'],
      running: [42, 28, 16, 54, 86, 156],
      stopped: [3, 2, 1, 4, 6, 8],
      fault: [1, 1, 0, 2, 3, 4],
    };
  }

  /** 生成水质监测数据 */
  function generateWaterQuality() {
    const levels = ['Ⅰ类', 'Ⅱ类', 'Ⅲ类', 'Ⅳ类', 'Ⅴ类'];
    const levelColors = ['#00e5a0', '#00b4ff', '#ffb300', '#ff7043', '#ff5252'];
    const levelValues = [1, 2, 3, 4, 5];
    return QUALITY_STATIONS.map((s, i) => {
      const lvIdx = Math.min(randInt(0, 4), 4);
      // 雷达图数据：pH、溶解氧、高锰酸盐、氨氮、总磷
      const radar = [
        rand(6.0, 8.5),     // pH
        rand(5.0, 9.0),     // 溶解氧 mg/L
        rand(1.0, 6.0),     // 高锰酸盐 mg/L
        rand(0.01, 0.5),    // 氨氮 mg/L
        rand(0.01, 0.3),    // 总磷 mg/L
      ];
      return {
        name: s.name,
        level: levels[lvIdx],
        levelValue: levelValues[lvIdx],
        levelColor: levelColors[lvIdx],
        radar: radar,
        indicators: ['pH', '溶解氧', '高锰酸盐', '氨氮', '总磷'],
      };
    });
  }

  /** 生成告警列表 */
  function generateAlerts(count) {
    const alerts = [];
    const now = new Date();

    // 预置几条固定的
    const fixedAlerts = [
      { level: 'warning', msg: '新丰江水库水位接近警戒线，当前水位 92.1m，警戒水位 95.5m', time: '10:22:15' },
      { level: 'critical', msg: '东江干流惠州段流量超警戒，当前流量 1120m³/s', time: '10:18:30' },
      { level: 'info', msg: '白盆珠水库闸门例行检修完成', time: '10:05:00' },
    ];

    fixedAlerts.forEach(a => alerts.push(a));

    for (let i = 0; i < count - fixedAlerts.length; i++) {
      const t = new Date(now);
      t.setMinutes(t.getMinutes() - randInt(1, 120));
      const template = pick(ALERT_TEMPLATES);
      const reservoir = pick(RESERVOIRS);
      const river = pick(RIVERS);
      const station = pick(QUALITY_STATIONS);
      const msg = template
        .replace('{reservoir}', reservoir.name)
        .replace('{river}', river.name)
        .replace('{station}', station.name)
        .replace('{level}', rand(80, 98).toString())
        .replace('{flow}', randInt(300, 2500).toString())
        .replace('{value}', rand(0.1, 9.9).toString());
      alerts.push({
        level: pick(ALERT_TYPES).level,
        msg: msg,
        time: formatTime(t),
      });
    }

    return alerts.sort((a, b) => b.time.localeCompare(a.time));
  }

  /** 生成供水趋势数据 */
  function generateSupplyTrend() {
    const data = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      data.push({
        month: `${d.getMonth() + 1}月`,
        supply: rand(320, 390),
        demand: rand(340, 410),
      });
    }
    return data;
  }

  /** 生成KPI数值 */
  function generateKPI() {
    return {
      reservoirCount: 24,
      avgLevel: rand(82, 88),
      totalCapacity: rand(12.0, 13.5),
      dailySupply: randInt(340, 380),
    };
  }

  // --- 完整数据包 ---
  function generateAll() {
    const now = new Date();
    return {
      timestamp: formatTime(now),
      fullDate: formatDate(now),
      dateStr: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
      kpi: generateKPI(),
      waterLevels: generateWaterLevels(),
      rainfall: generateRainfallTrend(),
      flows: generateFlowData(),
      device: generateDeviceStatus(),
      quality: generateWaterQuality(),
      alerts: generateAlerts(8),
      supply: generateSupplyTrend(),
    };
  }

  // --- 公开接口 ---
  return {
    generateAll,
    RESERVOIRS,
    RIVERS,
    QUALITY_STATIONS,
    generateAlerts,
  };
})();
