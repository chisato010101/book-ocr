// api.js — 對外 API 呼叫封裝

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const TYCG_PARKING_URL = 'https://parking-proxy.gyunim3333.workers.dev/';

/**
 * 地名 → 經緯度（Nominatim）
 * 注意：Nominatim 要求 User-Agent，但瀏覽器無法自訂 User-Agent header，
 * 改在 query string 帶 email 之類無法做；實務上瀏覽器發出的 User-Agent
 * 已是瀏覽器字串，Nominatim 在合理速率下可接受。
 */
async function geocode(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) throw new Error('請輸入地點名稱');

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(trimmed)}&format=json&limit=1&countrycodes=tw`;

  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    throw new Error('搜尋服務暫時無法使用，請稍後再試');
  }

  if (!res.ok) throw new Error('搜尋服務暫時無法使用，請稍後再試');

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('找不到這個地點，請換個關鍵字試試');
  }

  const first = data[0];
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('找不到這個地點，請換個關鍵字試試');
  }

  return {
    lat,
    lng,
    displayName: first.display_name || trimmed,
  };
}

/**
 * 取得桃園市路外停車場資料
 * 回傳：經正規化後的物件陣列
 */
async function fetchParkingLots() {
  let raw;
  try {
    const res = await fetch(TYCG_PARKING_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    raw = await res.json();
  } catch (e) {
    console.error('fetchParkingLots error:', e);
    throw new Error('停車場資料載入失敗，請稍後再試');
  }

  // API 結構通常是 { result: { records: [...] } }，不過為保險起見多寫幾種
  let records = [];
  if (raw && raw.result && Array.isArray(raw.result.records)) {
    records = raw.result.records;
  } else if (Array.isArray(raw)) {
    records = raw;
  } else if (raw && Array.isArray(raw.records)) {
    records = raw.records;
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('停車場資料載入失敗，請稍後再試');
  }

  return records.map(normalizeParkingRecord).filter(Boolean);
}

/**
 * 統一欄位、轉型、過濾無效資料。
 * 回傳 null 代表此筆資料不應納入。
 */
function normalizeParkingRecord(r) {
  if (!r) return null;

  // Display === "N" 過濾
  const display = (r.Display || r.display || '').toString().toUpperCase();
  if (display === 'N') return null;

  const lat = toNumber(r.wgsY);
  const lng = toNumber(r.wgsX);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: r.parkId || r.parkID || r.id || '',
    name: r.parkName || '未命名停車場',
    address: r.address || '',
    areaName: r.areaName || '',
    areaId: r.areaId || '',
    lat,
    lng,
    totalSpace: toNumber(r.totalSpace) || 0,
    surplusSpace: Number.isFinite(toNumber(r.surplusSpace)) ? toNumber(r.surplusSpace) : -1,
    chargingSpaces: toNumber(r.chargingSpaces) || 0,
    payGuide: r.payGuide || '',
    introduction: r.introduction || '',
  };
}

