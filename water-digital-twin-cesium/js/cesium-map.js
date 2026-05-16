/* =============================================
   水利数字孪生 - Cesium.js 3D 地球渲染
   真实 3D 地形 + 全球卫星底图 + 要素叠加
   ============================================= */

const CesiumMap = (() => {
  'use strict';

  const STATUS_COLORS = {
    normal: '#00b4ff', high: '#ff9100', warning: '#ffb300', danger: '#ff5252',
  };

  let viewer = null;
  let entityCollection = null;
  let selectedEntity = null;

  // ==================== 初始化 ====================
  function initMap(domId) {
    const dom = document.getElementById(domId);
    if (!dom) return;

    // 使用经典稳定 API（兼容所有 Cesium 版本）
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3OTNhNDU0Mi0yYjFhLTRhN2MtYmZhNy00Nzg0YzgwYmJhMzMiLCJpZCI6MjU5LCJpYXQiOjE2NDkwOTc1Njh9.demo';

    // 使用 OpenStreetMap 底图（无 token 要求，稳定可靠）
    const osmProvider = new Cesium.OpenStreetMapImageryProvider({
      url: 'https://tile.openstreetmap.org/',
    });

    viewer = new Cesium.Viewer(domId, {
      imageryProvider: osmProvider,
      terrain: Cesium.createWorldTerrain(),
      animation: false,
      timeline: false,
      fullscreenButton: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      geocoder: false,
      infoBox: false,
      selectionIndicator: false,
      skyAtmosphere: true,
      skyBox: true,
      useDefaultRenderLoop: true,
    });

    // 设置初始视角为广东省
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(113.5, 23.8, 500000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-25),
        roll: 0,
      },
    });

    // 光源
    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.saturationShift = 0.2;

    // 实体集合
    entityCollection = new Cesium.EntityCollection();
    viewer.entities.add(entityCollection);

    // 选中高亮
    viewer.screenSpaceEventHandler.setInputAction(function(click) {
      const pick = viewer.scene.pick(click.position);
      if (Cesium.defined(pick) && pick.id && pick.id._mapData) {
        selectEntity(pick.id);
      } else {
        deselectEntity();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 自动调整容器大小
    const observer = new ResizeObserver(() => {
      viewer.resize();
    });
    observer.observe(dom);

    return viewer;
  }

  // ==================== 选中/取消 ====================
  function selectEntity(entity) {
    deselectEntity();
    selectedEntity = entity;
    if (entity._mapData) {
      const d = entity._mapData;
      entity.billboard.scale = 1.5;
      showInfo(d);
    }
  }

  function deselectEntity() {
    if (selectedEntity) {
      if (selectedEntity._mapData) {
        selectedEntity.billboard.scale = 1.0;
      }
      hideInfo();
      selectedEntity = null;
    }
  }

  // ==================== 信息面板 ====================
  function createInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'cesium-info-panel';
    panel.style.cssText =
      'position:absolute;right:8px;top:8px;width:200px;background:rgba(10,22,40,0.92);' +
      'border:1px solid rgba(0,180,255,0.3);border-radius:6px;padding:10px 12px;' +
      'font-size:12px;color:#e8f4ff;display:none;z-index:100;' +
      'box-shadow:0 0 20px rgba(0,180,255,0.15);backdrop-filter:blur(8px);';
    panel.innerHTML = '<div id="cesium-info-content"></div>';
    return panel;
  }

  function showInfo(d) {
    const panel = document.getElementById('cesium-info-panel');
    if (!panel) return;
    const color = STATUS_COLORS[d.status] || STATUS_COLORS.normal;
    panel.innerHTML = `
      <div style="font-size:14px;font-weight:700;color:${color};margin-bottom:4px;">${d.name}</div>
      <div style="border-bottom:1px solid rgba(0,180,255,0.1);padding-bottom:4px;margin-bottom:4px;"></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:#5a7a9a;">水位</span><span style="color:${color};font-weight:600;">${d.level}m</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:#5a7a9a;">正常</span><span style="font-weight:600;">${d.normalLevel}m</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:#5a7a9a;">警戒</span><span style="color:#ffb300;font-weight:600;">${d.warnLevel}m</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:#5a7a9a;">保证</span><span style="color:#ff5252;font-weight:600;">${d.dangerLevel}m</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:#5a7a9a;">库容</span><span style="font-weight:600;">${d.capacity}亿m³</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:#5a7a9a;">状态</span><span style="color:${color};font-weight:600;">${d.statusText}</span></div>`;
    panel.style.display = 'block';
  }

  function hideInfo() {
    const panel = document.getElementById('cesium-info-panel');
    if (panel) panel.style.display = 'none';
  }

  // ==================== 渲染水库 ====================
  function renderReservoirs(data) {
    const waterLevels = data.waterLevels || [];

    waterLevels.forEach(r => {
      const res = MockData.RESERVOIRS.find(ri => ri.name === r.name);
      if (!res) return;

      const color = STATUS_COLORS[r.status] || STATUS_COLORS.normal;
      const size = Math.max(24, Math.min(r.capacity * 2 + 16, 48));

      const entity = viewer.entities.add({
        name: r.name,
        position: Cesium.Cartesian3.fromDegrees(res.lng, res.lat, 200),
        billboard: {
          image: createCircleImage(color, size),
          scale: 1.0,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: r.name.replace('水库', ''),
          font: '12px Microsoft YaHei',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -size / 2 - 8),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        // 存储业务数据
        _mapData: r,
      });
    });
  }

  // ==================== 创建圆形图片（Canvas生成） ====================
  function createCircleImage(color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size + 20;
    canvas.height = size + 20;
    const ctx = canvas.getContext('2d');

    // 外圈光晕
    const glow = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, size/4,
      canvas.width/2, canvas.height/2, size/2 + 8
    );
    glow.addColorStop(0, color + '66');
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, size/2 + 8, 0, Math.PI * 2);
    ctx.fill();

    // 主圆
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, size/2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    return canvas.toDataURL();
  }

  // ==================== 渲染河流 ====================
  function renderRivers(data) {
    const flows = data.flows || [];

    MockData.RIVERS.forEach(river => {
      if (!river.coords || river.coords.length < 2) return;

      const positions = river.coords.map(c =>
        Cesium.Cartesian3.fromDegrees(c[0], c[1], 50)
      );

      const flowData = flows.find(f => f.name === river.name);
      const flowValue = flowData ? flowData.flow : river.avgFlow;

      viewer.entities.add({
        name: river.name + ` (${flowValue}m³/s)`,
        polyline: {
          positions: positions,
          width: 3,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.3,
            color: Cesium.Color.fromCssColorString('#00e5a0'),
          }),
          clampToGround: true,
        },
      });
    });
  }

  // ==================== 渲染监测站 ====================
  function renderStations(data) {
    const quality = data.quality || [];
    const qColors = { 'Ⅰ类': '#00e5a0', 'Ⅱ类': '#00b4ff', 'Ⅲ类': '#ffb300', 'Ⅳ类': '#ff7043', 'Ⅴ类': '#ff5252' };

    quality.forEach(q => {
      const stn = MockData.QUALITY_STATIONS.find(s => s.name === q.name);
      if (!stn) return;

      const color = qColors[q.level] || '#8ab4d6';

      viewer.entities.add({
        name: `${stn.name} - ${q.level}`,
        position: Cesium.Cartesian3.fromDegrees(stn.lng, stn.lat, 100),
        billboard: {
          image: createCircleImage(color, 14),
          scale: 0.8,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: q.level,
          font: '10px Microsoft YaHei',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -8),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
    });
  }

  // ==================== 数据刷新 ====================
  function refreshData(data) {
    if (!viewer) return;

    // 清除旧实体
    viewer.entities.removeAll();
    entityCollection = viewer.entities;

    // 加上信息面板（确保存在）
    if (!document.getElementById('cesium-info-panel')) {
      const container = document.getElementById('cesium-map');
      if (container) container.appendChild(createInfoPanel());
    }

    // 重新渲染
    renderReservoirs(data);
    renderRivers(data);
    renderStations(data);

    // 危险水库自动飞行
    const dangerReservoir = (data.waterLevels || []).find(r => r.status === 'danger');
    if (dangerReservoir) {
      const res = MockData.RESERVOIRS.find(ri => ri.name === dangerReservoir.name);
      if (res) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(res.lng, res.lat, 150000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0,
          },
          duration: 2,
        });
      }
    }
  }

  // ==================== 清理 ====================
  function dispose() {
    if (viewer) {
      viewer.destroy();
      viewer = null;
    }
  }

  // ==================== 公开接口 ====================
  return {
    initMap,
    refreshData,
    dispose,
  };
})();
