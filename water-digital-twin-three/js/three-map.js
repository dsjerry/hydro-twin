/* =============================================
   水利数字孪生 - Three.js 3D 地形渲染
   地形网格 + 卫星纹理 + 3D 要素叠加
   ============================================= */

const ThreeMap = (() => {
  'use strict';

  const STATUS_COLORS = {
    normal: 0x00b4ff, high: 0xff9100, warning: 0xffb300, danger: 0xff5252,
  };
  const STATUS_COLORS_CSS = {
    normal: '#00b4ff', high: '#ff9100', warning: '#ffb300', danger: '#ff5252',
  };

  let scene, camera, renderer, labelRenderer, controls;
  let raycaster, mouse;
  let mapContainer, popupEl;
  let terrainGroup, featureGroup;
  let animFrameId;
  let clock;
  let isInitialized = false;

  // 广东省地理范围（用于坐标映射）
  const GD_BOUNDS = { minLng: 109.5, maxLng: 117.3, minLat: 20.2, maxLat: 25.5 };
  const TERRAIN_SIZE = 30; // 地形平面大小

  function lngLatToWorld(lng, lat) {
    const x = ((lng - GD_BOUNDS.minLng) / (GD_BOUNDS.maxLng - GD_BOUNDS.minLng) - 0.5) * TERRAIN_SIZE;
    const z = ((lat - GD_BOUNDS.minLat) / (GD_BOUNDS.maxLat - GD_BOUNDS.minLat) - 0.5) * TERRAIN_SIZE;
    return { x, z: -z }; // Three.js Z轴朝上为负
  }

  // 简单伪随机高度生成
  function getTerrainHeight(x, z) {
    // 用正弦叠加模拟地形起伏
    let h = 0;
    h += Math.sin(x * 0.8 + z * 0.6) * 0.6;
    h += Math.sin(x * 1.7 - z * 1.3) * 0.3;
    h += Math.cos(x * 0.3 + z * 0.9) * 0.4;
    h += Math.sin(x * 2.5 + z * 0.4) * 0.15;
    h += Math.cos(x * 0.1 - z * 2.1) * 0.2;
    // 粤北（z负方向）偏高，珠三角（z正方向）偏平
    h += (1 - (z + TERRAIN_SIZE/2) / TERRAIN_SIZE) * 0.3;
    return (h + 1.5) * 0.8; // 映射到 0.4~2.0 范围
  }

  // ==================== 初始化 ====================
  function initMap(domId) {
    mapContainer = document.getElementById(domId);
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();
    const w = rect.width || 600;
    const h = rect.height || 400;

    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.Fog(0x0a1628, 20, 45);

    // 相机
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(18, 14, 18);
    camera.lookAt(0, 0, 0);

    // WebGL 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mapContainer.appendChild(renderer.domElement);

    // CSS2D 标签渲染器
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    mapContainer.appendChild(labelRenderer.domElement);

    // 轨道控制
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.target.set(0, 0.3, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // 光线投射
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    clock = new THREE.Clock();

    // 光照
    const ambientLight = new THREE.AmbientLight(0x446688, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(10, 20, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x4488ff, 0x002244, 0.4);
    scene.add(hemiLight);

    // 地形组
    terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // 要素组（水库、河流）
    featureGroup = new THREE.Group();
    scene.add(featureGroup);

    // 生成地形
    generateTerrain();

    // 添加水面（半透明平面）
    addWaterPlane();

    // Popup
    popupEl = createPopup();
    mapContainer.appendChild(popupEl);

    // 点击事件
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Resize 监听
    const observer = new ResizeObserver(() => {
      const r = mapContainer.getBoundingClientRect();
      const w2 = r.width, h2 = r.height;
      if (w2 > 0 && h2 > 0) {
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
        labelRenderer.setSize(w2, h2);
      }
    });
    observer.observe(mapContainer);

    isInitialized = true;
    animate();

    return { scene, camera, renderer };
  }

  // ==================== 地形生成 ====================
  function generateTerrain() {
    const segments = 80;
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    let minH = Infinity, maxH = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = getTerrainHeight(x, z);
      pos.setY(i, h);
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }

    // 根据高度着色（卫星图风格）
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i);
      const t = (h - minH) / (maxH - minH); // 0~1

      let r, g, b;
      if (t < 0.15) {
        // 低洼水域
        r = 0.05 + t * 0.3; g = 0.15 + t * 0.4; b = 0.25 + t * 0.5;
      } else if (t < 0.4) {
        // 平原/农田
        const s = (t - 0.15) / 0.25;
        r = 0.12 + s * 0.25; g = 0.32 + s * 0.2; b = 0.12 + s * 0.08;
      } else if (t < 0.65) {
        // 丘陵/林地
        const s = (t - 0.4) / 0.25;
        r = 0.22 + s * 0.15; g = 0.35 + s * 0.1; b = 0.12 + s * 0.05;
      } else {
        // 山地
        const s = (t - 0.65) / 0.35;
        r = 0.30 + s * 0.2; g = 0.38 + s * 0.15; b = 0.20 + s * 0.1;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    terrainGroup.add(mesh);

    // 网格辅助线（科技感）
    const wireGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 30, 30);
    wireGeo.rotateX(-Math.PI / 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00b4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.04,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.y = 0.02;
    terrainGroup.add(wireMesh);
  }

  // ==================== 水面 ====================
  function addWaterPlane() {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE * 0.9, TERRAIN_SIZE * 0.9);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x006688,
      transparent: true,
      opacity: 0.15,
      roughness: 0.2,
      metalness: 0.3,
    });
    const water = new THREE.Mesh(geo, mat);
    water.position.y = 0.1;
    terrainGroup.add(water);
  }

  // ==================== 创建 Popup ====================
  function createPopup() {
    const el = document.createElement('div');
    el.className = 'three-popup';
    el.style.cssText =
      'position:absolute;display:none;background:rgba(10,22,40,0.95);border:1px solid rgba(0,180,255,0.3);' +
      'border-radius:6px;padding:10px 14px;font-size:13px;color:#e8f4ff;' +
      'box-shadow:0 0 20px rgba(0,180,255,0.15);pointer-events:none;' +
      'transform:translate(-50%,-100%);z-index:100;min-width:180px;';
    el.innerHTML = '<div class="three-popup-content"></div>';
    return el;
  }

  function showPopup(x, y, html) {
    popupEl.style.display = 'block';
    popupEl.style.left = x + 'px';
    popupEl.style.top = (y - 12) + 'px';
    popupEl.querySelector('.three-popup-content').innerHTML = html;
  }

  function hidePopup() {
    popupEl.style.display = 'none';
  }

  // ==================== 渲染水库 ====================
  function renderReservoirs(data) {
    const waterLevels = data.waterLevels || [];

    waterLevels.forEach(r => {
      const res = MockData.RESERVOIRS.find(ri => ri.name === r.name);
      if (!res) return;

      const { x, z } = lngLatToWorld(res.lng, res.lat);
      const h = getTerrainHeight(x, z) + 0.15;
      const color = STATUS_COLORS[r.status] || STATUS_COLORS.normal;
      const colorCSS = STATUS_COLORS_CSS[r.status] || STATUS_COLORS_CSS.normal;
      const radius = Math.max(0.15, Math.min(r.capacity / 100 + 0.1, 0.4));

      // 球体
      const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.3,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(x, h + radius, z);
      sphere.userData = {
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
        colorCSS: colorCSS,
      };
      featureGroup.add(sphere);

      // 光晕 (点光)
      const glowGeo = new THREE.SphereGeometry(radius * 1.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x, h + radius, z);
      featureGroup.add(glow);

      // CSS2D 标签
      const label = document.createElement('div');
      label.textContent = r.name.replace('水库', '');
      label.style.cssText =
        `color:#e8f4ff;font-size:11px;font-weight:600;text-shadow:0 0 8px rgba(0,0,0,0.8);` +
        `background:rgba(0,10,20,0.5);padding:1px 6px;border-radius:3px;` +
        `border:1px solid ${colorCSS};white-space:nowrap;`;
      const labelObj = new THREE.CSS2DObject(label);
      labelObj.position.set(x, h + radius * 3 + 0.4, z);
      featureGroup.add(labelObj);

      // 水波纹环
      const ringGeo = new THREE.RingGeometry(0.1, 0.15, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, h + 0.05, z);
      ring.userData = { isRipple: true, baseRadius: 0.1, phase: Math.random() * Math.PI * 2 };
      featureGroup.add(ring);
    });
  }

  // ==================== 渲染河流 ====================
  function renderRivers(data) {
    const flows = data.flows || [];

    MockData.RIVERS.forEach(river => {
      if (!river.coords || river.coords.length < 2) return;

      const points = river.coords.map(c => {
        const { x, z } = lngLatToWorld(c[0], c[1]);
        const h = getTerrainHeight(x, z) + 0.08;
        return new THREE.Vector3(x, h, z);
      });

      const curve = new THREE.CatmullRomCurve3(points);
      const curvePoints = curve.getPoints(50);
      const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);

      const flowData = flows.find(f => f.name === river.name);
      const flowValue = flowData ? flowData.flow : river.avgFlow;

      const mat = new THREE.LineBasicMaterial({
        color: 0x00e5a0,
        transparent: true,
        opacity: 0.7,
        linewidth: 1,
      });
      const line = new THREE.Line(geo, mat);
      line.userData = { type: 'river', name: river.name, flow: flowValue };
      featureGroup.add(line);
    });
  }

  // ==================== 渲染监测站 ====================
  function renderStations(data) {
    const quality = data.quality || [];
    const qColors = { 'Ⅰ类': 0x00e5a0, 'Ⅱ类': 0x00b4ff, 'Ⅲ类': 0xffb300, 'Ⅳ类': 0xff7043, 'Ⅴ类': 0xff5252 };
    const qColorsCSS = { 'Ⅰ类': '#00e5a0', 'Ⅱ类': '#00b4ff', 'Ⅲ类': '#ffb300', 'Ⅳ类': '#ff7043', 'Ⅴ类': '#ff5252' };

    quality.forEach(q => {
      const stn = MockData.QUALITY_STATIONS.find(s => s.name === q.name);
      if (!stn) return;

      const { x, z } = lngLatToWorld(stn.lng, stn.lat);
      const h = getTerrainHeight(x, z) + 0.1;
      const color = qColors[q.level] || 0x8ab4d6;
      const colorCSS = qColorsCSS[q.level] || '#8ab4d6';

      const geo = new THREE.SphereGeometry(0.1, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: color, emissive: color, emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h, z);
      mesh.userData = { type: 'station', name: stn.name, level: q.level, stationType: stn.type, colorCSS };
      featureGroup.add(mesh);
    });
  }

  // ==================== 点击交互 ====================
  function onMouseClick(event) {
    if (!isInitialized) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(featureGroup.children);

    let hit = null;
    for (const inter of intersects) {
      const obj = inter.object;
      if (obj.userData && obj.userData.type) {
        // 跳过光晕和水波纹
        if (obj.userData.type === 'reservoir') { hit = obj; break; }
        if (obj.userData.isRipple) continue;
        if (obj.userData.type) { hit = obj; break; }
      }
    }

    if (hit) {
      const d = hit.userData;
      if (d.type === 'reservoir') {
        showPopup(event.clientX - mapContainer.getBoundingClientRect().left,
          event.clientY - mapContainer.getBoundingClientRect().top,
          `<div style="font-size:15px;font-weight:700;color:#00b4ff;margin-bottom:4px;border-bottom:1px solid rgba(0,180,255,0.15);padding-bottom:3px;">${d.name}</div>` +
          `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#5a7a9a;">当前水位</span><span style="color:${d.colorCSS};font-weight:600;">${d.level}m</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#5a7a9a;">正常水位</span><span style="font-weight:600;">${d.normalLevel}m</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#5a7a9a;">警戒水位</span><span style="color:#ffb300;font-weight:600;">${d.warnLevel}m</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#5a7a9a;">库容</span><span style="font-weight:600;">${d.capacity}亿m³</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#5a7a9a;">状态</span><span style="color:${d.colorCSS};font-weight:600;">${d.statusText}</span></div>`);
      } else if (d.type === 'station') {
        showPopup(event.clientX - mapContainer.getBoundingClientRect().left,
          event.clientY - mapContainer.getBoundingClientRect().top,
          `<div style="font-size:15px;font-weight:700;color:#00b4ff;margin-bottom:4px;">${d.name}</div>` +
          `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#5a7a9a;">水质等级</span><span style="color:${d.colorCSS};font-weight:600;">${d.level}</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#5a7a9a;">类型</span><span style="font-weight:600;">${d.stationType}</span></div>`);
      } else {
        hidePopup();
      }
    } else {
      hidePopup();
    }
  }

  function onMouseMove(event) {
    if (!isInitialized) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(featureGroup.children);
    const hit = intersects.some(i => i.object.userData && i.object.userData.type);
    renderer.domElement.style.cursor = hit ? 'pointer' : '';
  }

  // ==================== 水波纹动画 ====================
  function updateRipples(time) {
    featureGroup.children.forEach(child => {
      if (child.userData && child.userData.isRipple && child.type === 'Mesh') {
        const phase = child.userData.phase || 0;
        const t = (time * 0.001 + phase) % (Math.PI * 2);
        const radius = 0.1 + Math.sin(t) * 0.3 + 0.3;
        const opacity = Math.max(0, 0.4 * (1 - (radius - 0.1) / 0.6));

        const scale = radius / 0.1;
        child.scale.set(scale, scale, scale);
        child.material.opacity = opacity;
      }
    });
  }

  // ==================== 动画循环 ====================
  function animate() {
    animFrameId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    controls.update();
    updateRipples(elapsed);

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  // ==================== 数据刷新 ====================
  function refreshData(data) {
    if (!isInitialized) return;

    // 清除旧要素（保留地形）
    while (featureGroup.children.length > 0) {
      const child = featureGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      featureGroup.remove(child);
    }

    // 重新渲染
    renderReservoirs(data);
    renderRivers(data);
    renderStations(data);
  }

  // ==================== 清理 ====================
  function dispose() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }
    if (labelRenderer && labelRenderer.domElement) {
      labelRenderer.domElement.remove();
    }
  }

  // ==================== 公开接口 ====================
  return {
    initMap,
    refreshData,
    dispose,
  };
})();
