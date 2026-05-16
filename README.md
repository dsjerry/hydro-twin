# 🌊 水利数字孪生综合管理平台

> 基于广东省水利场景的数字孪生大屏项目，包含三个不同地图引擎的实现版本。

---

## 项目背景

水利主题数字孪生大屏，展示广东省主要水库水位、河道流量、雨量趋势、水质监测、设备状态等实时数据。所有数据使用 **本地 Mock 数据**，无需后端服务，开箱即用。

---

## 三个版本对比

| 版本 | 目录 | 端口 | 地图引擎 | 核心方案 |
|------|------|------|---------|---------|
| 🅰 ECharts | `water-digital-twin/` | **8080** | ECharts 5.5 + GeoJSON | 行政地图填色 + 散点 + 线 |
| 🅱 Leaflet | `water-digital-twin-leaflet/` | **8081** | Leaflet 1.9.4 | 卫星/街道/地形底图 + GeoJSON叠加 |
| 🅲 OpenLayers | `water-digital-twin-ol/` | **8082** | OpenLayers v10.4 | 专业GIS引擎 + XYZ瓦片 + Vector要素 |

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
- Leaflet 1.9.4（B 版地图）
- OpenLayers v10.4.0（C 版地图）
- 纯原生 JavaScript + CSS
- 无任何后端依赖
