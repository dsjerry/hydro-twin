/* =============================================
   水利数字孪生 - API 数据接入层
   从 NestJS 后端获取数据
   ============================================= */
const API_BASE = 'http://localhost:3001/api';

const ApiData = (() => {
  'use strict';

  let reservoirs = [];
  let rivers = [];

  /** 获取静态数据（水库、河流，带坐标） */
  async function loadStaticData() {
    try {
      const [resRes, rivRes] = await Promise.all([
        fetch(`${API_BASE}/reservoirs`).then(r => r.json()),
        fetch(`${API_BASE}/rivers`).then(r => r.json()),
      ]);
      reservoirs = resRes;
      rivers = rivRes;

      // 存全局供 charts.js 地图渲染使用
      window.__RESERVOIRS = reservoirs;
      window.__RIVERS = rivers;

      console.log(`✅ 静态数据加载完成: ${reservoirs.length} 水库, ${rivers.length} 河流`);
      return true;
    } catch (err) {
      console.error('❌ 静态数据加载失败:', err);
      // fallback: 用空数组
      window.__RESERVOIRS = [];
      window.__RIVERS = [];
      return false;
    }
  }

  /** 获取完整仪表盘数据 */
  async function fetchAll() {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('❌ 仪表盘数据获取失败:', err);
      return null;
    }
  }

  return {
    loadStaticData,
    fetchAll,
  };
})();
