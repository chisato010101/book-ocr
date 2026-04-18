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

  const records = (raw && Array.isArray(raw.CarParks)) ? raw.CarParks : [];

  if (records.length === 0) {
    throw new Error('停車場資料載入失敗，請稍後再試');
  }

  return records.map(normalizeParkingRecord).filter(Boolean);
}

/**
 * 統一欄位、轉型、過濾無效資料（TDX 格式）
 */
function normalizeParkingRecord(r) {
  if (!r) return null;

  const pos = r.CarParkPosition || {};
  const lat = toNumber(pos.PositionLat);
  const lng = toNumber(pos.PositionLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const avail = r.Availability || {};
  const spaces = Array.isArray(avail.Spaces) ? avail.Spaces : null;

  // 車位：可能在 AvailableSpaces 或 Spaces[].AvailableSpaces
  let surplusSpace = -1;
  let totalSpace = 0;
  if (Number.isFinite(toNumber(avail.AvailableSpaces))) {
    surplusSpace = toNumber(avail.AvailableSpaces);
  } else if (spaces && spaces.length > 0) {
    const first = spaces[0];
    if (Number.isFinite(toNumber(first.AvailableSpaces))) {
      surplusSpace = toNumber(first.AvailableSpaces);
    }
  }

  if (Number.isFinite(toNumber(avail.TotalSpaces))) {
    totalSpace = toNumber(avail.TotalSpaces);
  } else if (spaces && spaces.length > 0) {
    const first = spaces[0];
    if (Number.isFinite(toNumber(first.TotalSpaces))) {
      totalSpace = toNumber(first.TotalSpaces);
    }
  }

  const name = (r.CarParkName && (r.CarParkName.Zh_tw || r.CarParkName.En)) || '未命名停車場';

  return {
    id: r.CarParkID || '',
    name,
    address: r.Address || '',
    areaName: '',
    areaId: '',
    lat,
    lng,
    totalSpace,
    surplusSpace,
    chargingSpaces: 0,
    payGuide: r.FareDescription || '',
    introduction: r.Description || '',
  };
}

