# 🌊 水利数字孪生综合管理平台

> 基于广东省水利场景的数字孪生大屏项目，包含六个不同地图引擎的实现版本。

---

## 项目背景

水利主题数字孪生大屏，展示广东省主要水库水位、河道流量、雨量趋势、水质监测、设备状态等实时数据。所有数据使用 **本地 Mock 数据**，无需后端服务，开箱即用。

---

## 六个版本对比

| 版本 | 目录 | 端口 | 地图引擎 | 核心方案 |
|------|------|------|---------|---------|
| 🅰 ECharts | `water-digital-twin/` | **8080** | ECharts 5.5 + GeoJSON | 行政地图填色 + 散点 + 线 |
| 🅱 Leaflet | `water-digital-twin-leaflet/` | **8081** | Leaflet 1.9.4 | 卫星/街道/地形底图 + GeoJSON叠加 |
| 🅲 OpenLayers | `water-digital-twin-ol/` | **8082** | OpenLayers v10.4 | 专业GIS引擎 + XYZ瓦片 + Vector要素 |
| 🅳 ECharts GL (2.5D) | `water-digital-twin-3d/` | **8083** | ECharts GL 2.0.9 | 3D地图柱 + 水波纹 + 自转场景 |
| 🅴 Three.js 3D 地形 | `water-digital-twin-three/` | **8084** | Three.js r128 | 3D地形网格 + 卫星风冒着色 + OrbitControls |
| 🅵 Cesium.js 3D 地球 | `water-digital-twin-cesium/` | **8085** | Cesium 1.118 | 真实3D地球 + WorldTerrain + 全球底图 |

### 🅰 ECharts 版本

**地图方案：** ECharts Map + 广东省 GeoJSON 行政区划图（DataV 提供）

- 注册 `guangdong` 地图，21个地市降雨量填色
- 水库散点图层（状态着色：正常蓝/警戒黄/危险红）
- 5条主要河流带水流动画箭头效果（lines series + effect）
- 右侧 visualMap 渐变色图例
- 点击交互 + hover popup

**适用场景：** 轻量展示、行政汇报、不需要真实地理底图的场合

### 🅱 Leaflet 版本

**地图方案：** Leaflet + 三种瓦片底图可切换

- **卫星底图：** ESRI World Imagery（真实地球影像）
- **街道底图：** OpenStreetMap 标准瓦片
- **地形底图：** OpenTopoMap 等高线地形
- CircleMarker 水库点位 + Polyline 河流 + 水质站
- 底图切换按钮（右上角卫星/街道/地形）
- 自定义暗色主题 Popup + 图例
- 危险水库自动定位动画

**适用场景：** 真实效果优先、需要卫星影像做背景、快速原型

### 🅲 OpenLayers 版本

**地图方案：** OpenLayers v10.4 + XYZ 瓦片 + Vector 图层

- 专业投影坐标系管理（`ol.proj.fromLonLat`）
- Feature 属性管理（`feature.get/set`）
- 精确的 `forEachFeatureAtPixel` 点击检测
- Overlay 组件管理的 Popup，带三角箭头
- 自动 `ResizeObserver` 监听容器大小变化
- 三种底图底层切换（不经过 DOM）

**适用场景：** 需要叠加 WMS/WMTS、栅格计算、专业 GIS 功能扩展

### 🅳 ECharts GL 2.5D 版本

**地图方案：** ECharts GL + `geo3D` + `bar3D` + `scatter3D`

- `geo3D` 广东省地图 3D 抬升，带光影材质和 SSAO 环境光遮蔽
- `bar3D` 降雨量光柱：21个地市上空半透明柱体，颜色渐变
- `lines3D` 河流动效：5条河流带流动光点轨迹
- `scatter3D` 水库发光球体，水位状态着色（蓝/黄/红）
- 水波纹扩散动画：每座水库持续向外扩散半透明圆环
- 场景自动旋转（`autoRotate`），点击地图暂停/恢复
- `postEffect` 泛光（Bloom）效果增强视觉冲击

**适用场景：** 汇报展示、科技感大屏、需要视觉冲击力的场合

### 🅴 Three.js 3D 地形版本

**地图方案：** Three.js r128 + PlaneGeometry 地形网格 + 逐顶点着色

- 80×80 分段 PlaneGeometry，正弦函数叠加生成丘陵/山地
- 逐顶点着色：低洼蓝 → 平原绿 → 丘陵棕 → 山地灰
- DirectionalLight + HemisphereLight 光照系统，带阴影投射
- OrbitControls 自由拖拽/缩放/自动旋转
- 水库发光球体 + 水波纹 RingGeometry 缩放动画
- 河流 CatmullRomCurve3 平滑曲线
- Raycaster 点击检测 + CSS2DRenderer 标签始终面向相机

**适用场景：** 需要 3D 立体感但不愿用 Cesium 大包的场合、游戏化展示

### 🅵 Cesium.js 3D 地球版本

**地图方案：** Cesium 1.118 + WorldTerrain 真实 3D 地形 + OSM 全球底图

- 真实 3D 地球，广东省上空 40° 俯视角
- Cesium World Terrain 全球高程数据
- Canvas 生成的圆形 Billboard 水库标注（带光晕效果）
- PolylineGlowMaterial 发光河流线，贴地渲染
- 点击水库弹出信息面板（水位/库容/状态）
- 危险水库自动 `camera.flyTo` 飞行定位
- 选中高亮放大效果

**适用场景：** 专业水利数字孪生、需要真实地形的项目、洪水淹没模拟等 GIS 深度应用

---

## 项目结构（通用）

```
water-digital-twin/
├── index.html              # 主页面
├── css/
│   └── style.css           # 暗色科技感大屏样式
├── js/
│   ├── mock-data.js        # Mock 数据生成器（8水库 + 5河流 + 6水质站）
│   ├── charts.js           # ECharts 图表配置（6个图表）
│   ├── leaflet-map.js      # Leaflet 地图渲染（仅 Leaflet 版）
│   ├── openlayers-map.js   # OpenLayers 地图渲染（仅 OL 版）
│   ├── three-map.js        # Three.js 3D 地图渲染（仅 Three 版）
│   ├── cesium-map.js       # Cesium 3D 地球渲染（仅 Cesium 版）
│   └── main.js             # 主逻辑（时钟、粒子、数据刷新）
└── assets/
    └── guangdong.json      # 广东省 GeoJSON（192KB）
```

## 数据覆盖

| 模块 | 数据来源 | 可视化方式 |
|------|---------|-----------|
| 水库水位监测 | Mock（8水库） | ECharts 柱状图 |
| 雨量趋势 | Mock（近7天） | 柱线组合图 |
| 河道流量 | Mock（5河流） | 折线图 + 平均线 |
| 设备状态 | Mock（6类设备382台） | 环形图 |
| 水质监测 | Mock（6站点） | 雷达图（点击切换） |
| 供水趋势 | Mock（近12月） | 柱线组合图 |
| 实时告警 | Mock 随机生成 | 滚动列表（4秒轮播） |
| GIS 地图 | GeoJSON + 瓦片底图 | 视版本而定 |

## 启动方式

```bash
# 每个目录内运行 HTTP 服务即可
cd ~/workspace/water-digital-twin-all/water-digital-twin
python3 -m http.server 8080

# 然后访问对应的 localhost 端口
```

## 技术栈

- ECharts 5.5.0（所有版本的图表）
- ECharts GL 2.0.9（2.5D 版地图）
- Leaflet 1.9.4（B 版地图）
- OpenLayers v10.4.0（C 版地图）
- Three.js r128（E 版地图）
- Cesium 1.118（F 版地图）
- 纯原生 JavaScript + CSS
- 无任何后端依赖
