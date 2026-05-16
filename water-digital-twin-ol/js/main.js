/* =============================================
   水利数字孪生 - 主逻辑（Leaflet 版本）
   ============================================= */

(() => {
  'use strict';

  // ==================== 时钟 ====================
  function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent =
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    document.getElementById('date').textContent =
      `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 周${['日','一','二','三','四','五','六'][now.getDay()]}`;
  }

  // ==================== 核心指标 ====================
  function updateKPI(kpi) {
    animateNumber('kpi-reservoir', kpi.reservoirCount);
    animateNumber('kpi-water-level', kpi.avgLevel, 1);
    animateNumber('kpi-capacity', kpi.totalCapacity, 1);
    animateNumber('kpi-supply', kpi.dailySupply);
  }

  function animateNumber(id, target, decimals) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseFloat(el.textContent) || 0;
    const diff = target - current;
    const steps = 20;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const val = current + (diff * step / steps);
      el.textContent = decimals !== undefined ? val.toFixed(1) : Math.round(val);
      if (step >= steps) {
        el.textContent = decimals !== undefined ? target.toFixed(1) : Math.round(target);
        clearInterval(timer);
      }
    }, 30);
  }

  // ==================== 告警列表 ====================
  function renderAlerts(alerts) {
    const container = document.getElementById('alert-list');
    const levelMap = { critical: '紧急', warning: '警告', info: '提示' };

    container.innerHTML = alerts.map(a =>
      `<div class="alert-item">
        <span class="alert-level ${a.level}">${levelMap[a.level] || a.level}</span>
        <span class="alert-time">${a.time}</span>
        <span class="alert-msg">${a.msg}</span>
      </div>`
    ).join('');

    document.getElementById('alert-count').textContent = `${alerts.filter(a => a.level !== 'info').length}条未处理`;
  }

  // ==================== 底图切换按钮 ====================
  function initTileSwitcher() {
    document.querySelectorAll('.map-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const type = this.dataset.tile;
        OLMap.switchTile(type);
      });
    });
  }

  // ==================== 粒子动画 ====================
  function initParticles() {
    const bg = document.getElementById('particle-bg');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    bg.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];
    const COUNT = 50;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.4 + 0.1,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 180, 255, ${p.alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });
    resize();
    createParticles();
    draw();
  }

  // ==================== 数据刷新流程 ====================
  let refreshTimer = null;

  function refreshAll() {
    const data = MockData.generateAll();

    // 更新时间
    document.getElementById('footer-status').textContent =
      `系统运行正常  ·  数据更新时间: ${data.dateStr} ${data.timestamp}`;

    // KPI
    updateKPI(data.kpi);

    // 图表 — 销毁重建（除了 Leaflet 地图）
    const prevInstances = window.__chartInstances || {};
    Object.keys(prevInstances).forEach(key => {
      try { prevInstances[key].dispose(); } catch(e) {}
    });
    window.__chartInstances = {};

    ChartRenderer.renderWaterLevelChart('chart-water-level', data.waterLevels);
    ChartRenderer.renderRainfallChart('chart-rainfall', data.rainfall);
    ChartRenderer.renderFlowChart('chart-flow', data.flows);
    ChartRenderer.renderDeviceChart('chart-device', data.device);
    ChartRenderer.renderWaterQualityChart('chart-water-quality', data.quality);
    ChartRenderer.renderSupplyChart('chart-supply', data.supply);

    // OL 地图刷新（只更新要素，不重建地图）
    OLMap.refreshData(data);

    // 告警
    renderAlerts(data.alerts);
  }

  // ==================== 告警滚动 ====================
  function initAlertScroll() {
    const list = document.getElementById('alert-list');
    if (!list) return;
    setInterval(() => {
      const items = list.querySelectorAll('.alert-item');
      if (items.length <= 3) return;
      items[0].style.transition = 'all 0.5s ease';
      items[0].style.opacity = '0';
      items[0].style.transform = 'translateX(-30px)';
      setTimeout(() => {
        list.appendChild(items[0]);
        items[0].style.transition = 'none';
        items[0].style.opacity = '1';
        items[0].style.transform = 'translateX(0)';
      }, 500);
    }, 4000);
  }

  // ==================== 启动 ====================
  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initParticles();
    initTileSwitcher();

    // 初始化 OpenLayers 地图
    OLMap.initMap('ol-map');
    OLMap.initInteraction();

    // 首次加载数据
    refreshAll();
    initAlertScroll();

    // 每 30 秒刷新一次
    refreshTimer = setInterval(refreshAll, 30000);

    // 窗口缩放时 resize 图表
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ChartRenderer.resizeAll();
        // OL 自动处理 resize（updateSize 在 ResizeObserver 里做了）
      }, 200);
    });

    console.log('🌊 水利数字孪生平台（OpenLayers卫星底图版）已启动');
    console.log('📊 数据每30秒自动刷新');
  }

  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
