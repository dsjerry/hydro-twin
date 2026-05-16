/* =============================================
   水利数字孪生 - Leaflet 地图渲染
   底图: ESRI 卫星 + OSM 街道 + OSM 地形
   GeoJSON 叠加: 水库、河流、监测站
   ============================================= */

const LeafletMap = (() => {
  'use strict';

  // 瓦片底图配置
  const TILE_PROVIDERS = {
    satellite: {
      name: '卫星',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: '&copy; Esri',
      maxZoom: 19,
    },
    street: {
      name: '街道',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap',
      maxZoom: 19,
    },
    terrain: {
      name: '地形',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenTopoMap',
      maxZoom: 17,
    },
  };

  // 状态颜色映射
  const STATUS_COLORS = {
    normal: '#00b4ff',
    high: '#ff9100',
    warning: '#ffb300',
    danger: '#ff5252',
  };

  // 水质等级颜色
  const QUALITY_COLORS = {
    'Ⅰ类': '#00e5a0',
    'Ⅱ类': '#00b4ff',
    'Ⅲ类': '#ffb300',
    'Ⅳ类': '#ff7043',
    'Ⅴ类': '#ff5252',
  };

  let mapInstance = null;
  let layerGroup = null;
  let currentTileType = 'satellite';
  let tileLayer = null;

  // ==================== 初始化地图 ====================
  function initMap(domId) {
    const dom = document.getElementById(domId);
    if (!dom) return null;

    // 广东省中心坐标
    const center = [23.5, 113.5];

    mapInstance = L.map(domId, {
      center: center,
      zoom: 8,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // 加载默认底图
    switchTile('satellite');

    // 创建图层组用于存放水利要素
    layerGroup = L.layerGroup().addTo(mapInstance);

    // 添加图例
    addLegend(dom);

    // resize 处理
    const observer = new ResizeObserver(() => {
      mapInstance.invalidateSize();
    });
    observer.observe(dom);

    return mapInstance;
  }

  // ==================== 底图切换 ====================
  function switchTile(type) {
    if (!mapInstance) return;
    const provider = TILE_PROVIDERS[type];
    if (!provider) return;

    if (tileLayer) {
      mapInstance.removeLayer(tileLayer);
    }

    tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      attribution: provider.attr,
      opacity: 0.95,
    }).addTo(mapInstance);

    currentTileType = type;

    // 更新按钮状态
    document.querySelectorAll('.map-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tile === type);
    });
  }

  // ==================== 渲染水库点位 ====================
  function renderReservoirs(data) {
    if (!layerGroup) return;

    const waterLevels = data.waterLevels || [];

    waterLevels.forEach(r => {
      const res = MockData.RESERVOIRS.find(ri => ri.name === r.name);
      if (!res || !res.lng || !res.lat) return;

      const color = STATUS_COLORS[r.status] || STATUS_COLORS.normal;
      const size = Math.max(8, Math.min(r.capacity / 5 + 6, 22));

      const marker = L.circleMarker([res.lat, res.lng], {
        radius: size,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.7,
      });

      marker.bindPopup(`
        <div class="popup-title">${r.name}</div>
        <div class="popup-row"><span class="popup-label">当前水位</span><span class="popup-value" style="color:${color}">${r.level}m</span></div>
        <div class="popup-row"><span class="popup-label">正常水位</span><span class="popup-value">${r.normalLevel}m</span></div>
        <div class="popup-row"><span class="popup-label">警戒水位</span><span class="popup-value" style="color:#ffb300">${r.warnLevel}m</span></div>
        <div class="popup-row"><span class="popup-label">保证水位</span><span class="popup-value" style="color:#ff5252">${r.dangerLevel}m</span></div>
        <div class="popup-row"><span class="popup-label">库容</span><span class="popup-value">${r.capacity}亿m³</span></div>
        <div class="popup-row"><span class="popup-label">库容占比</span><span class="popup-value">${r.capRate}%</span></div>
        <div class="popup-row"><span class="popup-label">状态</span><span class="popup-value" style="color:${color}">${r.statusText}</span></div>
      `, { closeButton: true, className: 'dark-popup' });

      layerGroup.addLayer(marker);
    });
  }

  // ==================== 渲染河流线 ====================
  function renderRivers(data) {
    if (!layerGroup) return;

    const flows = data.flows || [];

    MockData.RIVERS.forEach(river => {
      if (!river.coords || river.coords.length < 2) return;

      const flowData = flows.find(f => f.name === river.name);
      const flowValue = flowData ? flowData.flow : river.avgFlow;

      // 转为 Leaflet latlng 格式 [lat, lng]
      const latlngs = river.coords.map(c => [c[1], c[0]]);

      const polyline = L.polyline(latlngs, {
        color: '#00e5a0',
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1.5,
        dashArray: null,
      });

      polyline.bindPopup(`
        <div class="popup-title">${river.name}</div>
        <div class="popup-row"><span class="popup-label">当前流量</span><span class="popup-value" style="color:#00e5a0">${flowValue}m³/s</span></div>
        <div class="popup-row"><span class="popup-label">平均流量</span><span class="popup-value">${river.avgFlow}m³/s</span></div>
      `);

      layerGroup.addLayer(polyline);
    });
  }

  // ==================== 渲染水质监测站 ====================
  function renderStations(data) {
    if (!layerGroup) return;

    const quality = data.quality || [];

    quality.forEach(q => {
      const station = MockData.QUALITY_STATIONS.find(s => s.name === q.name);
      if (!station || !station.lng || !station.lat) return;

      const color = QUALITY_COLORS[q.level] || '#8ab4d6';

      const marker = L.circleMarker([station.lat, station.lng], {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6,
      });

      marker.bindPopup(`
        <div class="popup-title">${station.name}</div>
        <div class="popup-row"><span class="popup-label">水质等级</span><span class="popup-value" style="color:${color}">${q.level}</span></div>
        <div class="popup-row"><span class="popup-label">类型</span><span class="popup-value">${station.type}</span></div>
      `);

      layerGroup.addLayer(marker);
    });
  }

  // ==================== 添加图例 ====================
  function addLegend(dom) {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function() {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = `
        <div style="font-weight:700;color:#e8f4ff;margin-bottom:4px;font-size:12px;">图例</div>
        <div class="legend-item"><span class="legend-dot" style="background:#00b4ff"></span> 水库（正常）</div>
        <div class="legend-item"><span class="legend-dot" style="background:#ffb300"></span> 水库（警戒）</div>
        <div class="legend-item"><span class="legend-dot" style="background:#ff5252"></span> 水库（危险）</div>
        <div class="legend-item"><span class="legend-dot" style="background:#00e5a0;border-radius:2px;width:16px;height:3px;"></span> 主要河流</div>
        <div class="legend-item"><span class="legend-dot" style="background:#ff7043"></span> 水质监测站</div>
      `;
      return div;
    };

    legend.addTo(mapInstance);
  }

  // ==================== 数据刷新 ====================
  function refreshData(data) {
    if (!layerGroup || !mapInstance) return;

    // 清空图层组
    layerGroup.clearLayers();

    // 重新渲染所有要素
    renderReservoirs(data);
    renderRivers(data);
    renderStations(data);

    // 更新告警数据 - 如果有红色告警，地图自动定位到该点
    const dangerReservoir = (data.waterLevels || []).find(r => r.status === 'danger');
    if (dangerReservoir) {
      const res = MockData.RESERVOIRS.find(ri => ri.name === dangerReservoir.name);
      if (res && res.lat && res.lng) {
        mapInstance.setView([res.lat, res.lng], 9, { animate: true });
      }
    }
  }

  // ==================== 公开接口 ====================
  return {
    initMap,
    switchTile,
    refreshData,
  };
})();
