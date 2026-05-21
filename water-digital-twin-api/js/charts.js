/* =============================================
   水利数字孪生 - ECharts 图表配置
   ============================================= */

const ChartRenderer = (() => {
  'use strict';

  // --- 通用 ECharts 主题颜色 ---
  const COLORS = {
    primary: '#00b4ff',
    primaryLight: '#4dc8ff',
    secondary: '#00e5a0',
    warn: '#ffb300',
    danger: '#ff5252',
    bg: 'rgba(16, 42, 78, 0)',
    grid: 'rgba(0, 180, 255, 0.08)',
    text: '#8ab4d6',
    textLight: '#e8f4ff',
    blue: '#00b4ff',
    cyan: '#00e5a0',
    purple: '#7c4dff',
    orange: '#ff9100',
    red: '#ff5252',
    green: '#69f0ae',
  };

  const palette = ['#00b4ff', '#00e5a0', '#7c4dff', '#ffb300', '#ff5252', '#4dc8ff'];

  // --- 通用 tooltip ---
  const tooltipBase = {
    backgroundColor: 'rgba(10, 22, 40, 0.9)',
    borderColor: 'rgba(0, 180, 255, 0.3)',
    borderWidth: 1,
    textStyle: { color: '#e8f4ff', fontSize: 12 },
    extraCssText: 'box-shadow: 0 0 12px rgba(0,180,255,0.15);',
  };

  // --- 1. 水库水位监测（柱状图） ---
  function renderWaterLevelChart(domId, data) {
    const dom = document.getElementById(domId);
    if (!dom) return;

    const statusColors = {
      normal: COLORS.primary,
      high: COLORS.orange,
      warning: COLORS.warn,
      danger: COLORS.danger,
    };

    const chart = echarts.init(dom, null, { renderer: 'canvas' });
    const option = {
      tooltip: {
        ...tooltipBase,
        formatter: function(params) {
          const d = data[params[0].dataIndex];
          return `<b>${d.name}</b><br/>
            当前水位: <span style="color:${statusColors[d.status]}">${d.level}m</span><br/>
            正常水位: ${d.normalLevel}m<br/>
            警戒水位: ${d.warnLevel}m<br/>
            保证水位: ${d.dangerLevel}m<br/>
            库容: ${d.capacity}亿m³<br/>
            库容占比: ${d.capRate}%`;
        }
      },
      grid: { top: 24, bottom: 28, left: 44, right: 12 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name.replace('水库', '')),
        axisLabel: { color: COLORS.text, fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '水位(m)',
        nameTextStyle: { color: COLORS.text, fontSize: 10 },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        axisLabel: { color: COLORS.text, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        barWidth: '55%',
        data: data.map(d => ({
          value: d.level,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: statusColors[d.status] },
              { offset: 1, color: statusColors[d.status] + '55' },
            ]),
            borderRadius: [3, 3, 0, 0],
            shadowColor: statusColors[d.status] + '33',
            shadowBlur: 6,
          },
        })),
        label: {
          show: true,
          position: 'top',
          color: COLORS.text,
          fontSize: 10,
          formatter: p => p.value + 'm',
        },
      }],
    };

    chart.setOption(option);
    window.__chartInstances = window.__chartInstances || {};
    window.__chartInstances[domId] = chart;
    return chart;
  }

  // --- 2. 雨量趋势（折线图+柱状图组合） ---
  function renderRainfallChart(domId, data) {
    const dom = document.getElementById(domId);
    if (!dom) return;

    const chart = echarts.init(dom, null, { renderer: 'canvas' });
    const option = {
      tooltip: {
        ...tooltipBase,
        trigger: 'axis',
        formatter: function(params) {
          const p = params[0];
          const d = data[p.dataIndex];
          return `${d.date}<br/>降雨量: <span style="color:${COLORS.primary}">${d.rainfall}mm</span><br/>雨天数: ${d.days}天`;
        },
      },
      legend: {
        data: ['降雨量', '雨天数'],
        textStyle: { color: COLORS.text, fontSize: 10 },
        top: 0,
        right: 0,
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { top: 28, bottom: 22, left: 40, right: 36 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date),
        axisLabel: { color: COLORS.text, fontSize: 10 },
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisTick: { show: false },
      },
      yAxis: [{
        type: 'value',
        name: 'mm',
        nameTextStyle: { color: COLORS.text, fontSize: 10 },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        axisLabel: { color: COLORS.text, fontSize: 10 },
        max: 100,
      }, {
        type: 'value',
        name: '天',
        nameTextStyle: { color: COLORS.text, fontSize: 10 },
        splitLine: { show: false },
        axisLabel: { color: COLORS.text, fontSize: 10 },
        max: 10,
      }],
      series: [{
        name: '降雨量',
        type: 'bar',
        barWidth: '40%',
        yAxisIndex: 0,
        data: data.map(d => ({
          value: d.rainfall,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: COLORS.primary },
              { offset: 1, color: COLORS.primary + '44' },
            ]),
            borderRadius: [2, 2, 0, 0],
          },
        })),
      }, {
        name: '雨天数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: COLORS.warn, width: 2 },
        itemStyle: { color: COLORS.warn },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: COLORS.warn + '44' },
            { offset: 1, color: COLORS.warn + '11' },
          ]),
        },
        data: data.map(d => d.days),
      }],
    };

    chart.setOption(option);
    window.__chartInstances[domId] = chart;
    return chart;
  }

  // --- 3. 河道流量监测（折线图） ---
  function renderFlowChart(domId, data) {
    const dom = document.getElementById(domId);
    if (!dom) return;

    const chart = echarts.init(dom, null, { renderer: 'canvas' });
    const option = {
      tooltip: {
        ...tooltipBase,
        trigger: 'axis',
        formatter: function(params) {
          const p = params[0];
          const d = data[p.dataIndex];
          return `<b>${d.name}</b><br/>
            当前流量: <span style="color:${COLORS.primary}">${d.flow}m³/s</span><br/>
            平均流量: ${d.avgFlow}m³/s<br/>
            最大流量: ${d.maxFlow}m³/s`;
        },
      },
      grid: { top: 16, bottom: 24, left: 44, right: 16 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { color: COLORS.text, fontSize: 10 },
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'm³/s',
        nameTextStyle: { color: COLORS.text, fontSize: 10 },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        axisLabel: { color: COLORS.text, fontSize: 10 },
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'diamond',
        symbolSize: 8,
        lineStyle: { color: COLORS.cyan, width: 2 },
        itemStyle: { color: COLORS.cyan },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: COLORS.cyan + '44' },
            { offset: 1, color: COLORS.cyan + '11' },
          ]),
        },
        data: data.map(d => ({
          value: d.flow,
          itemStyle: d.flow > d.avgFlow * 1.3
            ? { color: COLORS.danger }
            : d.flow > d.avgFlow * 1.1
              ? { color: COLORS.warn }
              : { color: COLORS.cyan },
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          label: { color: COLORS.text, fontSize: 9, formatter: '平均: {c}' },
          data: data.map(d => ({
            yAxis: d.avgFlow,
            lineStyle: { color: COLORS.warn + '66', type: 'dashed', width: 1 },
          })),
        },
      }],
    };

    chart.setOption(option);
    window.__chartInstances[domId] = chart;
    return chart;
  }

  // --- 4. 设备运行状态（环形图） ---
  function renderDeviceChart(domId, data) {
    const dom = document.getElementById(domId);
    if (!dom) return;

    const chart = echarts.init(dom, null, { renderer: 'canvas' });

    // 计算总数
    let totalRunning = 0, totalStopped = 0, totalFault = 0;
    for (let i = 0; i < data.categories.length; i++) {
      totalRunning += data.running[i];
      totalStopped += data.stopped[i];
      totalFault += data.fault[i];
    }

    const option = {
      tooltip: {
        ...tooltipBase,
        formatter: function(params) {
          if (params.name === '运行') {
            let html = '<b>设备运行明细</b><br/>';
            data.categories.forEach((cat, i) => {
              html += `${cat}: ${data.running[i]}台 停运${data.stopped[i]}台 故障${data.fault[i]}台<br/>`;
            });
            return html;
          }
          return `${params.name}: ${params.value}台 (${params.percent}%)`;
        },
      },
      legend: {
        data: ['运行', '停运', '故障'],
        textStyle: { color: COLORS.text, fontSize: 10 },
        bottom: 0,
        itemWidth: 10,
        itemHeight: 8,
      },
      grid: { top: 0, bottom: 0, left: 0, right: 0 },
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        padAngle: 2,
        itemStyle: {
          borderRadius: 4,
          borderColor: 'rgba(16, 42, 78, 0.4)',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          color: COLORS.text,
          fontSize: 10,
          lineHeight: 14,
        },
        labelLine: {
          lineStyle: { color: COLORS.grid },
        },
        data: [
          { value: totalRunning, name: '运行', itemStyle: { color: COLORS.green } },
          { value: totalStopped, name: '停运', itemStyle: { color: COLORS.warn } },
          { value: totalFault, name: '故障', itemStyle: { color: COLORS.danger } },
        ],
      }],
    };

    chart.setOption(option);
    window.__chartInstances[domId] = chart;
    return chart;
  }

  // --- 5. 水质监测（雷达图） ---
  function renderWaterQualityChart(domId, data) {
    const dom = document.getElementById(domId);
    if (!dom) return;

    const chart = echarts.init(dom, null, { renderer: 'canvas' });

    // 使用第一个监测站的数据，让用户可通过点击切换
    const station = data[0];

    const option = {
      tooltip: {
        ...tooltipBase,
      },
      radar: {
        indicator: station.indicators.map((name, i) => ({
          name: name,
          max: i === 0 ? 14 : i === 1 ? 12 : 10,
        })),
        radius: '60%',
        center: ['50%', '50%'],
        axisName: {
          color: COLORS.text,
          fontSize: 10,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(0, 180, 255, 0.02)', 'rgba(0, 180, 255, 0.05)'],
          },
        },
        splitLine: {
          lineStyle: { color: COLORS.grid },
        },
        axisLine: {
          lineStyle: { color: COLORS.grid },
        },
      },
      series: [{
        type: 'radar',
        data: [{
          value: station.radar,
          name: station.name,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: COLORS.primary + '66' },
              { offset: 1, color: COLORS.cyan + '22' },
            ]),
          },
          lineStyle: { color: COLORS.primary, width: 2 },
          itemStyle: { color: COLORS.primary },
        }],
      }],
    };

    chart.setOption(option);
    window.__chartInstances[domId] = chart;

    // 可点击切换到不同监测站
    let currentIdx = 0;
    chart.on('click', () => {
      currentIdx = (currentIdx + 1) % data.length;
      const s = data[currentIdx];
      chart.setOption({
        series: [{
          data: [{
            value: s.radar,
            name: s.name,
          }],
        }],
      });
    });

    return chart;
  }

  // --- 6. 供水趋势分析（柱状+折线混合） ---
  function renderSupplyChart(domId, data) {
    const dom = document.getElementById(domId);
    if (!dom) return;

    const chart = echarts.init(dom, null, { renderer: 'canvas' });
    const option = {
      tooltip: {
        ...tooltipBase,
        trigger: 'axis',
        formatter: function(params) {
          const p = params[0];
          const d = data[p.dataIndex];
          return `<b>${d.month}</b><br/>
            供水量: <span style="color:${COLORS.primary}">${d.supply}万吨</span><br/>
            需求量: <span style="color:${COLORS.warn}">${d.demand}万吨</span><br/>
            缺口: <span style="color:${d.supply >= d.demand ? COLORS.green : COLORS.danger}">${(d.supply - d.demand).toFixed(1)}万吨</span>`;
        },
      },
      legend: {
        data: ['供水量', '需求量'],
        textStyle: { color: COLORS.text, fontSize: 10 },
        top: 0,
        right: 0,
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { top: 28, bottom: 22, left: 40, right: 12 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.month),
        axisLabel: { color: COLORS.text, fontSize: 10 },
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '万吨',
        nameTextStyle: { color: COLORS.text, fontSize: 10 },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        axisLabel: { color: COLORS.text, fontSize: 10 },
      },
      series: [{
        name: '供水量',
        type: 'bar',
        barWidth: '30%',
        data: data.map(d => ({
          value: d.supply,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: COLORS.primary },
              { offset: 1, color: COLORS.primary + '44' },
            ]),
            borderRadius: [2, 2, 0, 0],
          },
        })),
      }, {
        name: '需求量',
        type: 'line',
        smooth: true,
        symbol: 'emptyCircle',
        symbolSize: 6,
        lineStyle: { color: COLORS.warn, width: 2, type: 'dashed' },
        itemStyle: { color: COLORS.warn },
        data: data.map(d => d.demand),
      }],
    };

    chart.setOption(option);
    window.__chartInstances[domId] = chart;
    return chart;
  }

  /** 广东省地图（ECharts Map + GeoJSON） */
  function renderGuangdongMap(domId, data) {
    const dom = document.getElementById(domId);
    if (!dom) return Promise.resolve(null);

    // 已缓存则直接渲染
    if (window.__gdMapLoaded) {
      _renderMap(dom, domId, data);
      return Promise.resolve(window.__chartInstances[domId]);
    }

    return fetch('assets/guangdong.json')
      .then(r => r.json())
      .then(geoJson => {
        // 注册广东省地图（包含各地市边界）
        echarts.registerMap('guangdong', geoJson);
        window.__gdMapLoaded = true;
        _renderMap(dom, domId, data);
        return window.__chartInstances[domId];
      })
      .catch(err => {
        console.error('地图加载失败:', err);
        dom.innerHTML = '<div style="color:#5a7a9a;text-align:center;padding-top:80px;">🗺 地图数据加载失败</div>';
        return null;
      });
  }

  function _renderMap(dom, domId, data) {
    // 各地市模拟降雨填色数据
    const cityRainfall = {
      '广州市': 38, '深圳市': 42, '珠海市': 55, '汕头市': 32,
      '佛山市': 45, '韶关市': 62, '河源市': 58, '梅州市': 48,
      '惠州市': 50, '汕尾市': 36, '东莞市': 40, '中山市': 44,
      '江门市': 52, '阳江市': 60, '湛江市': 45, '茂名市': 55,
      '肇庆市': 48, '清远市': 65, '潮州市': 30, '揭阳市': 35,
      '云浮市': 42,
    };

    // 水库散点数据（从全局变量读取，由 api-data.js 加载）
    const reservoirs = window.__RESERVOIRS || [];
    const reservoirData = (data.waterLevels || []).map(r => {
      const res = reservoirs.find(ri => ri.name === r.name);
      return {
        name: r.name,
        value: [res ? Number(res.lng) : 114.0, res ? Number(res.lat) : 23.5, r.level],
        level: r.level,
        status: r.status,
        capacity: r.capacity,
        capRate: r.capRate,
      };
    }).filter(r => r.value[0] && r.value[1]);

    // 河流线数据
    const rivers = window.__RIVERS || [];
    const riverLines = rivers.map(r => ({
      name: r.name,
      coords: r.coords,
      flow: (data.flows || []).find(f => f.name === r.name)?.flow || r.avgFlow,
    }));

    const chart = echarts.init(dom, null, { renderer: 'canvas' });

    const option = {
      tooltip: {
        ...tooltipBase,
        trigger: 'item',
        formatter: function(params) {
          if (params.seriesType === 'map') {
            const rain = cityRainfall[params.name] || '-';
            return `<b>${params.name}</b><br/>24h降雨量: <span style="color:${COLORS.primary}">${rain}mm</span>`;
          }
          if (params.seriesType === 'scatter') {
            const d = params.data;
            return `<b>${d.name}</b><br/>
              当前水位: <span style="color:${d.status === 'danger' ? COLORS.danger : d.status === 'warning' ? COLORS.warn : COLORS.primary}">${d.level}m</span><br/>
              库容: ${d.capacity}亿m³<br/>
              库容占比: ${d.capRate}%`;
          }
          if (params.seriesType === 'lines') {
            return `<b>${params.seriesName}</b><br/>当前流量: ${params.data.flow}m³/s`;
          }
          return params.name;
        },
      },
      visualMap: {
        min: 20,
        max: 80,
        left: 12,
        bottom: 12,
        text: ['多雨', '少雨'],
        textStyle: { color: COLORS.text, fontSize: 9 },
        inRange: {
          color: ['#0a3d62', '#0a5c7a', '#0d8ab4', '#1ab0d4', '#48d6e0', '#7ae8ba'],
        },
        calculable: true,
        itemWidth: 10,
        itemHeight: 80,
      },
      geo: {
        map: 'guangdong',
        roam: true,
        zoom: 1.2,
        center: [113.5, 23.8],
        label: {
          show: true,
          color: '#e8f4ff',
          fontSize: 10,
        },
        itemStyle: {
          areaColor: 'rgba(10, 42, 72, 0.6)',
          borderColor: 'rgba(0, 180, 255, 0.3)',
          borderWidth: 1.2,
          shadowColor: 'rgba(0, 180, 255, 0.05)',
          shadowBlur: 4,
        },
        emphasis: {
          label: { color: '#fff', fontSize: 12 },
          itemStyle: {
            areaColor: 'rgba(0, 180, 255, 0.25)',
            borderColor: COLORS.primary,
            borderWidth: 1.5,
          },
        },
      },
      series: [
        // 1. 降雨量填色
        {
          name: '降雨量',
          type: 'map',
          map: 'guangdong',
          geoIndex: 0,
          data: Object.entries(cityRainfall).map(([name, value]) => ({
            name, value,
          })),
          z: 1,
        },
        // 2. 河流线
        ...riverLines.map(river => ({
          name: river.name,
          type: 'lines',
          coordinateSystem: 'geo',
          data: [{ coords: river.coords, flow: river.flow }],
          lineStyle: {
            color: COLORS.cyan,
            width: 2.5,
            opacity: 0.7,
            curveness: 0.1,
            shadowColor: 'rgba(0, 229, 160, 0.15)',
            shadowBlur: 6,
          },
          effect: {
            show: true,
            period: 4,
            trailLength: 0.3,
            symbol: 'arrow',
            symbolSize: 6,
            color: COLORS.cyanLight || '#7ae8ba',
          },
          z: 2,
        })),
        // 3. 水库散点
        {
          name: '水库',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: reservoirData,
          symbol: 'circle',
          symbolSize: function(val) {
            const capacity = val[2] ? Math.min(val[2] / 10 + 8, 20) : 10;
            return Math.max(capacity, 6);
          },
          label: {
            show: true,
            formatter: function(p) { return p.data.name.replace('水库', ''); },
            color: '#e8f4ff',
            fontSize: 10,
            position: 'right',
          },
          itemStyle: {
            color: function(p) {
              const status = p.data.status;
              return status === 'danger' ? COLORS.danger
                : status === 'warning' ? COLORS.warn
                : COLORS.primary;
            },
            borderColor: 'rgba(255,255,255,0.3)',
            borderWidth: 1.5,
            shadowColor: function(p) {
              const status = p.data.status;
              return status === 'danger' ? 'rgba(255,82,82,0.5)'
                : status === 'warning' ? 'rgba(255,179,0,0.5)'
                : 'rgba(0,180,255,0.5)';
            },
            shadowBlur: 8,
          },
          emphasis: {
            scale: 1.5,
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
          },
          z: 3,
        },
      ],
    };

    chart.setOption(option);
    window.__chartInstances[domId] = chart;

    // 点击水库跳转效果
    chart.on('click', function(params) {
      if (params.seriesType === 'scatter' && params.data) {
        // 闪烁高亮
        chart.dispatchAction({
          type: 'highlight',
          seriesIndex: 2,
          dataIndex: params.dataIndex,
        });
      }
    });
  }

  /** 重置所有图表 */
  function resizeAll() {
    const instances = window.__chartInstances || {};
    Object.values(instances).forEach(c => {
      try { c.resize(); } catch(e) {}
    });
  }

  // --- 公开接口 ---
  return {
    renderWaterLevelChart,
    renderRainfallChart,
    renderFlowChart,
    renderDeviceChart,
    renderWaterQualityChart,
    renderSupplyChart,
    renderGuangdongMap,
    resizeAll,
  };
})();
