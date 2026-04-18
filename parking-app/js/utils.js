// utils.js — 工具函式（距離計算、格式化、Google Maps URL）

/**
 * Haversine 公式計算兩點間距離（公尺）
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半徑（公尺）
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 格式化距離：< 1000m 顯示公尺，>= 1000m 顯示公里
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} 公尺`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}

/**
 * 依剩餘車位回傳顏色等級
 *   green : > 30% 總車位
 *   yellow: > 0
 *   red   : === 0
 *   gray  : -1（無資料）
 */
function getSurplusLevel(surplus, total) {
  if (surplus === -1 || surplus == null) return 'gray';
  if (surplus === 0) return 'red';
  if (total > 0 && surplus > total * 0.3) return 'green';
  return 'yellow';
}

/**
 * 對應 emoji 圖示
 */
function getSurplusIcon(level) {
  return { green: '🟢', yellow: '🟡', red: '🔴', gray: '⚪' }[level] || '⚪';
}

/**
 * 剩餘車位的顯示文字
 */
function formatSurplus(surplus, total) {
  if (surplus === -1 || surplus == null) return '無即時資料';
  return `剩餘 ${surplus} / ${total} 位`;
}

/**
 * 整理收費標準字串：去除多餘空白、把連續換行收斂
 */
function formatPayGuide(payGuide) {
  if (!payGuide || typeof payGuide !== 'string') return '依現場公告';
  const cleaned = payGuide.trim().replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n');
  return cleaned || '依現場公告';
}

/**
 * 產生 Google Maps 導航連結（使用者位置 → 目的地）
 */
function gmapsDirectionUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * 產生 Google Maps 地點查看連結（顯示評分／評論）
 * 用名稱+地址查詢比座標查詢更容易顯示出地點資訊卡
 */
function gmapsSearchUrl(parkName, address, lat, lng) {
  const q = (parkName || '') + ' ' + (address || '');
  const trimmed = q.trim();
  if (trimmed) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * 安全地把可能是 string 的數字欄位轉成 number；失敗回傳 NaN
 */
function toNumber(v) {
  if (v == null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * 簡單的 escape 防 XSS（在 innerHTML 注入字串時使用）
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
