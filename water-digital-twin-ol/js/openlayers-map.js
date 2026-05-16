/* =============================================
   水利数字孪生 - OpenLayers 地图渲染
   底图: ESRI 卫星 + OSM 街道 + 地形
   Vector 叠加: 水库、河流、监测站
   ============================================= */

const OLMap = (() => {
  'use strict';

  const STATUS_COLORS = {
    normal: '#00b4ff',
    high: '#ff9100',
    warning: '#ffb300',
    danger: '#ff5252',
  };

  const QUALITY_COLORS = {
    'Ⅰ类': '#00e5a0',
    'Ⅱ类': '#00b4ff',
    'Ⅲ类': '#ffb300',
    'Ⅳ类': '#ff7043',
    'Ⅴ类': '#ff5252',
  };

  let map = null;
  let vectorLayer = null;
  let vectorSource = null;
  let popupOverlay = null;
  let currentTileLayer = null;

  // ==================== 底图来源 ====================
  function createTileLayer(type) {
    const projections = {
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      },
      street: {
        url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        maxZoom: 19,
      },
      terrain: {
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
      },
    };

    const cfg = projections[type] || projections.satellite;
    return new ol.layer.Tile({
      source: new ol.source.OSM(),
      visible: true,
      zIndex: 0,
    });
  }

  // 由于 OpenLayers 的 OSM 源只有 OSM，卫星和地形用 XYZ
  function createXYZLayer(type) {
    const sources = {
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: '&copy; Esri',
      },
      street: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maxZoom: 19,
        attributions: '&copy; OpenStreetMap',
      },
      terrain: {
        url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
        attributions: '&copy; OpenTopoMap',
      },
    };

    const cfg = sources[type] || sources.satellite;
    return new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: cfg.url,
        maxZoom: cfg.maxZoom,
        attributions: cfg.attributions,
      }),
      zIndex: 0,
    });
  }

  // ==================== 初始化地图 ====================
  function initMap(domId) {
    const dom = document.getElementById(domId);
    if (!dom) return null;

    // 转换为 EPSG:3857 坐标
    const center = ol.proj.fromLonLat([113.5, 23.8]);

    // 矢量数据源
    vectorSource = new ol.source.Vector();
    vectorLayer = new ol.layer.Vector({
      source: vectorSource,
      zIndex: 10,
    });

    // 卫星底图
    currentTileLayer = createXYZLayer('satellite');

    // Popup 覆盖层
    popupOverlay = new ol.Overlay({
      element: createPopupElement(),
      positioning: 'bottom-center',
      stopEvent: true,
      offset: [0, -10],
    });

    map = new ol.Map({
      target: domId,
      layers: [currentTileLayer, vectorLayer],
      view: new ol.View({
        center: center,
        zoom: 7.8,
        minZoom: 6,
        maxZoom: 18,
      }),
      controls: ol.control.defaults.defaults({
        attribution: false,
        zoomOptions: {
          className: 'ol-custom-zoom',
        },
      }),
    });

    map.addOverlay(popupOverlay);

    // 添加自定义图例
    addLegend(dom);

    // resize 处理
    const observer = new ResizeObserver(() => {
      map.updateSize();
    });
    observer.observe(dom);

    return map;
  }

  // ==================== 创建 Popup 元素 ====================
  function createPopupElement() {
    const div = document.createElement('div');
    div.className = 'ol-popup';
    div.innerHTML = '<div class="ol-popup-content" id="popup-content"></div>';
    return div;
  }

  // 显示 Popup
  function showPopup(coords, html) {
    const content = document.getElementById('popup-content');
    if (content) {
      content.innerHTML = html;
    }
    popupOverlay.setPosition(coords);
  }

  // 隐藏 Popup
  function hidePopup() {
    popupOverlay.setPosition(undefined);
  }

  // ==================== 底图切换 ====================
  function switchTile(type) {
    if (!map) return;

    map.removeLayer(currentTileLayer);
    currentTileLayer = createXYZLayer(type);
    map.getLayers().insertAt(0, currentTileLayer);

    // 更新按钮状态
    document.querySelectorAll('.map-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tile === type);
    });
  }

  // ==================== 渲染水库 ====================
  function renderReservoirs(data) {
    const waterLevels = data.waterLevels || [];

    waterLevels.forEach(r => {
      const res = MockData.RESERVOIRS.find(ri => ri.name === r.name);
      if (!res || !res.lng || !res.lat) return;

      const color = STATUS_COLORS[r.status] || STATUS_COLORS.normal;
      const size = Math.max(8, Math.min(r.capacity / 5 + 6, 22));

      const coords = ol.proj.fromLonLat([res.lng, res.lat]);
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(coords),
        type: 'reservoir',
        name: r.name,
        level: r.level,
        normalLevel: r.normalLevel,
        warnLevel: r.warnLevel,
        dangerLevel: r.dangerLevel,
        capacity: r.capacity,
        capRate: r.capRate,
        status: r.status,
        statusText: r.statusText,
      });

      feature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
          radius: size / 2,
          fill: new ol.style.Fill({
            color: color + 'bb',
          }),
          stroke: new ol.style.Stroke({
            color: '#ffffff',
            width: 1.5,
          }),
        }),
        text: new ol.style.Text({
          text: r.name.replace('水库', ''),
          font: '10px "Microsoft YaHei"',
          fill: new ol.style.Fill({ color: '#e8f4ff' }),
          stroke: new ol.style.Stroke({
            color: 'rgba(0,10,20,0.6)',
            width: 2,
          }),
          offsetY: -(size / 2 + 10),
          textAlign: 'center',
        }),
      }));

      vectorSource.addFeature(feature);
    });
  }

  // ==================== 渲染河流 ====================
  function renderRivers(data) {
    const flows = data.flows || [];

    MockData.RIVERS.forEach(river => {
      if (!river.coords || river.coords.length < 2) return;

      const flowData = flows.find(f => f.name === river.name);
      const flowValue = flowData ? flowData.flow : river.avgFlow;

      const coords = river.coords.map(c => ol.proj.fromLonLat([c[0], c[1]]));

      const feature = new ol.Feature({
        geometry: new ol.geom.LineString(coords),
        type: 'river',
        name: river.name,
        flow: flowValue,
        avgFlow: river.avgFlow,
      });

      feature.setStyle(new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 229, 160, 0.7)',
          width: 3,
        }),
      }));

      vectorSource.addFeature(feature);
    });
  }

  // ==================== 渲染水质站 ====================
  function renderStations(data) {
    const quality = data.quality || [];

    quality.forEach(q => {
      const station = MockData.QUALITY_STATIONS.find(s => s.name === q.name);
      if (!station || !station.lng || !station.lat) return;

      const color = QUALITY_COLORS[q.level] || '#8ab4d6';
      const coords = ol.proj.fromLonLat([station.lng, station.lat]);
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(coords),
        type: 'station',
        name: station.name,
        level: q.level,
        stationType: station.type,
      });

      feature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({
            color: color + '99',
          }),
          stroke: new ol.style.Stroke({
            color: '#ffffff',
            width: 1,
          }),
        }),
      }));

      vectorSource.addFeature(feature);
    });
  }

  // ==================== 点击交互 ====================
  function initInteraction() {
    if (!map) return;

    map.on('click', function(evt) {
      const pixel = evt.pixel;

      const feature = map.forEachFeatureAtPixel(pixel, function(feat) {
        return feat;
      });

      if (!feature) {
        hidePopup();
        return;
      }

      const type = feature.get('type');
      const coords = feature.getGeometry().getFirstCoordinate
        ? feature.getGeometry().getFirstCoordinate()
        : feature.getGeometry().getCoordinates();

      let html = '';

      if (type === 'reservoir') {
        const color = STATUS_COLORS[feature.get('status')] || STATUS_COLORS.normal;
        html = `
          <div class="popup-title">${feature.get('name')}</div>
          <div class="popup-row"><span class="popup-label">当前水位</span><span class="popup-value" style="color:${color}">${feature.get('level')}m</span></div>
          <div class="popup-row"><span class="popup-label">正常水位</span><span class="popup-value">${feature.get('normalLevel')}m</span></div>
          <div class="popup-row"><span class="popup-label">警戒水位</span><span class="popup-value" style="color:#ffb300">${feature.get('warnLevel')}m</span></div>
          <div class="popup-row"><span class="popup-label">保证水位</span><span class="popup-value" style="color:#ff5252">${feature.get('dangerLevel')}m</span></div>
          <div class="popup-row"><span class="popup-label">库容</span><span class="popup-value">${feature.get('capacity')}亿m³</span></div>
          <div class="popup-row"><span class="popup-label">库容占比</span><span class="popup-value">${feature.get('capRate')}%</span></div>
          <div class="popup-row"><span class="popup-label">状态</span><span class="popup-value" style="color:${color}">${feature.get('statusText')}</span></div>
        `;
      } else if (type === 'river') {
        html = `
          <div class="popup-title">${feature.get('name')}</div>
          <div class="popup-row"><span class="popup-label">当前流量</span><span class="popup-value" style="color:#00e5a0">${feature.get('flow')}m³/s</span></div>
          <div class="popup-row"><span class="popup-label">平均流量</span><span class="popup-value">${feature.get('avgFlow')}m³/s</span></div>
        `;
      } else if (type === 'station') {
        const color = QUALITY_COLORS[feature.get('level')] || '#8ab4d6';
        html = `
          <div class="popup-title">${feature.get('name')}</div>
          <div class="popup-row"><span class="popup-label">水质等级</span><span class="popup-value" style="color:${color}">${feature.get('level')}</span></div>
          <div class="popup-row"><span class="popup-label">类型</span><span class="popup-value">${feature.get('stationType')}</span></div>
        `;
      }

      if (html) {
        showPopup(coords, html);
      }
    });

    // hover 光标变化
    map.on('pointermove', function(evt) {
      const pixel = evt.pixel;
      const hit = map.hasFeatureAtPixel(pixel);
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  }

  // ==================== 图例 ====================
  function addLegend(dom) {
    const legendEl = document.createElement('div');
    legendEl.className = 'map-legend';
    legendEl.innerHTML = `
      <div style="font-weight:700;color:#e8f4ff;margin-bottom:4px;font-size:12px;">图例</div>
      <div class="legend-item"><span class="legend-dot" style="background:#00b4ff"></span> 水库（正常）</div>
      <div class="legend-item"><span class="legend-dot" style="background:#ffb300"></span> 水库（警戒）</div>
      <div class="legend-item"><span class="legend-dot" style="background:#ff5252"></span> 水库（危险）</div>
      <div class="legend-item"><span class="legend-dot" style="background:#00e5a0;border-radius:2px;width:16px;height:3px;"></span> 主要河流</div>
      <div class="legend-item"><span class="legend-dot" style="background:#ff7043"></span> 水质监测站</div>
    `;
    dom.appendChild(legendEl);
  }

  // ==================== 数据刷新 ====================
  function refreshData(data) {
    if (!vectorSource) return;

    // 清空要素
    vectorSource.clear();

    // 重新渲染
    renderReservoirs(data);
    renderRivers(data);
    renderStations(data);

    // 危险水库自动定位
    const dangerReservoir = (data.waterLevels || []).find(r => r.status === 'danger');
    if (dangerReservoir) {
      const res = MockData.RESERVOIRS.find(ri => ri.name === dangerReservoir.name);
      if (res && res.lat && res.lng) {
        const view = map.getView();
        view.animate({
          center: ol.proj.fromLonLat([res.lng, res.lat]),
          zoom: 9,
          duration: 1000,
        });
      }
    }
  }

  // ==================== 公开接口 ====================
  return {
    initMap,
    switchTile,
    refreshData,
    initInteraction,
  };
})();
