// app.js — 主程式：UI 事件、流程控制、地圖整合、清單渲染

(() => {
  'use strict';

  // ---------- 狀態 ----------
  const state = {
    destination: null,        // { lat, lng, label }
    parkingLots: [],          // 全部桃園停車場
    nearby: [],               // 經距離篩選 + 排序後的結果
    filterAvailable: false,
    sortBy: 'distance',
    map: null,
    destMarker: null,
    parkingMarkers: new Map(), // id → marker
    activeId: null,
    isSearching: false,
  };

  const RADIUS_METERS = 2000; // 2 公里
  const MAP_DEFAULT_CENTER = [24.9936, 121.3010]; // 桃園市政府附近
  const MAP_DEFAULT_ZOOM = 12;
  const MAX_MAP_MARKERS = 10;

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    form: $('#search-form'),
    input: $('#search-input'),
    searchBtn: $('#search-btn'),
    geoBtn: $('#geo-btn'),
    message: $('#message-area'),
    resultsSection: $('#results-section'),
    resultsTitle: $('#results-title'),
    list: $('#parking-list'),
    filterAvailable: $('#filter-available'),
    sortSelect: $('#sort-select'),
  };

  // ---------- 初始化 ----------
  function init() {
    initMap();
    bindEvents();
  }

  function initMap() {
    state.map = L.map('map', { zoomControl: true })
      .setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(state.map);
  }

  function bindEvents() {
    els.form.addEventListener('submit', onSearchSubmit);
    els.geoBtn.addEventListener('click', onGeoClick);
    els.filterAvailable.addEventListener('change', () => {
      state.filterAvailable = els.filterAvailable.checked;
      renderResults();
    });
    els.sortSelect.addEventListener('change', () => {
      state.sortBy = els.sortSelect.value;
      renderResults();
    });
  }

  // ---------- 訊息 ----------
  function showMessage(text, type = 'info') {
    els.message.className = `message-area ${type}`;
    if (type === 'loading') {
      els.message.innerHTML = `<span class="spinner"></span>${escapeHtml(text)}`;
    } else {
      els.message.textContent = text;
    }
  }
  function clearMessage() {
    els.message.className = 'message-area';
    els.message.textContent = '';
  }

  // ---------- 事件 handlers ----------
  async function onSearchSubmit(e) {
    e.preventDefault();
    if (state.isSearching) return;
    const q = els.input.value.trim();
    if (!q) return;
    await runSearchByQuery(q);
  }

  async function onGeoClick() {
    if (state.isSearching) return;
    if (!('geolocation' in navigator)) {
      showMessage('您的瀏覽器不支援定位功能', 'error');
      return;
    }
    showMessage('正在取得您的位置…', 'loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await runSearchByCoords(latitude, longitude, '我的目前位置');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        showMessage('無法取得您的位置，請改用搜尋功能', 'error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  // ---------- 搜尋流程 ----------
  async function runSearchByQuery(query) {
    state.isSearching = true;
    setSearchingUI(true);
    showMessage('正在搜尋地點…', 'loading');
    try {
      const place = await geocode(query);
      await runSearchByCoords(place.lat, place.lng, place.displayName || query);
    } catch (err) {
      console.error(err);
      showMessage(err.message || '搜尋失敗', 'error');
      state.isSearching = false;
      setSearchingUI(false);
    }
  }

  async function runSearchByCoords(lat, lng, label) {
    state.isSearching = true;
    setSearchingUI(true);
    state.destination = { lat, lng, label };
    showMessage('正在載入停車場資料…', 'loading');

    try {
      // 第一次搜尋才抓資料；之後直接用快取
      if (state.parkingLots.length === 0) {
        state.parkingLots = await fetchParkingLots();
      }
      computeNearby();
      renderResults();
      placeDestinationMarker();
      renderMapMarkers();
      fitMapToResults();

      if (state.nearby.length === 0) {
        showMessage('附近 2 公里內沒有收錄的停車場，試試擴大範圍或換個地點', 'info');
      } else {
        clearMessage();
      }
    } catch (err) {
      console.error(err);
      showMessage(err.message || '載入失敗', 'error');
    } finally {
      state.isSearching = false;
      setSearchingUI(false);
    }
  }

  function setSearchingUI(searching) {
    els.searchBtn.disabled = searching;
    els.geoBtn.disabled = searching;
  }

  // ---------- 計算附近停車場 ----------
  function computeNearby() {
    const { lat, lng } = state.destination;
    state.nearby = state.parkingLots
      .map((p) => ({
        ...p,
        distance: calculateDistance(lat, lng, p.lat, p.lng),
      }))
      .filter((p) => p.distance <= RADIUS_METERS)
      .sort((a, b) => a.distance - b.distance);
  }

  function getDisplayList() {
    let list = state.nearby.slice();
    if (state.filterAvailable) {
      list = list.filter((p) => p.surplusSpace > 0);
    }
    if (state.sortBy === 'surplus') {
      list.sort((a, b) => {
        // -1 排最後
        const sa = a.surplusSpace < 0 ? -Infinity : a.surplusSpace;
        const sb = b.surplusSpace < 0 ? -Infinity : b.surplusSpace;
        return sb - sa;
      });
    } else {
      list.sort((a, b) => a.distance - b.distance);
    }
    return list;
  }

  // ---------- 渲染清單 ----------
  function renderResults() {
    if (!state.destination) return;
    const list = getDisplayList();

    els.resultsSection.hidden = false;
    els.resultsTitle.textContent =
      `附近停車場（共 ${list.length} 個` +
      (state.filterAvailable ? '・已過濾' : '') +
      '）';

    if (list.length === 0) {
      els.list.innerHTML =
        '<li class="card-row muted" style="padding:12px;">沒有符合條件的停車場。</li>';
      return;
    }

    els.list.innerHTML = list.map(renderCardHtml).join('');

    // 卡片點擊 → 地圖聚焦
    els.list.querySelectorAll('.parking-card').forEach((cardEl) => {
      cardEl.addEventListener('click', (e) => {
        // 避免點按鈕也觸發
        if (e.target.closest('a, button')) return;
        const id = cardEl.dataset.id;
        focusOnParking(id);
      });
    });
  }

  function renderCardHtml(p) {
    const level = getSurplusLevel(p.surplusSpace, p.totalSpace);
    const icon = getSurplusIcon(level);
    const surplusText = formatSurplus(p.surplusSpace, p.totalSpace);
    const distText = formatDistance(p.distance);
    const payText = formatPayGuide(p.payGuide);
    const dirUrl = gmapsDirectionUrl(p.lat, p.lng);
    const searchUrl = gmapsSearchUrl(p.name, p.address, p.lat, p.lng);

    const charging =
      p.chargingSpaces > 0
        ? `<div class="card-row muted"><span class="icon">🔌</span>充電車位：${p.chargingSpaces} 位</div>`
        : '';

    return `
      <li>
        <article class="parking-card" data-id="${escapeHtml(p.id)}">
          <h3 class="card-title">🅿️ ${escapeHtml(p.name)}</h3>
          <div class="card-row"><span class="icon">📍</span>${escapeHtml(distText)}${
      p.areaName ? `・${escapeHtml(p.areaName)}` : ''
    }</div>
          <div class="card-row">
            <span class="icon">${icon}</span>
            <span class="surplus surplus-${level}">${escapeHtml(surplusText)}</span>
          </div>
          <div class="card-row pay"><span class="icon">💰</span>${escapeHtml(payText)}</div>
          ${
            p.address
              ? `<div class="card-row muted"><span class="icon">📫</span>${escapeHtml(p.address)}</div>`
              : ''
          }
          ${charging}
          <div class="card-actions">
            <a class="btn btn-primary" href="${dirUrl}" target="_blank" rel="noopener" aria-label="開啟 Google Maps 導航至 ${escapeHtml(
      p.name
    )}">🗺️ 導航</a>
            <a class="btn btn-secondary" href="${searchUrl}" target="_blank" rel="noopener" aria-label="在 Google Maps 查看 ${escapeHtml(
      p.name
    )} 的詳情">⭐ Google Maps 查看</a>
          </div>
        </article>
      </li>`;
  }

  // ---------- 地圖標記 ----------
  function placeDestinationMarker() {
    const { lat, lng, label } = state.destination;
    if (state.destMarker) {
      state.destMarker.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: '',
        html: '<div class="dest-marker" aria-label="目的地"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      });
      state.destMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(state.map);
    }
    state.destMarker.bindPopup(`<b>目的地</b><br>${escapeHtml(label || '')}`);
  }

  function renderMapMarkers() {
    // 清除舊標記
    state.parkingMarkers.forEach((m) => state.map.removeLayer(m));
    state.parkingMarkers.clear();

    const list = getDisplayList().slice(0, MAX_MAP_MARKERS);
    list.forEach((p) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="parking-marker" title="${escapeHtml(p.name)}">P</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(state.map);
      const surplusText = formatSurplus(p.surplusSpace, p.totalSpace);
      marker.bindPopup(
        `<b>${escapeHtml(p.name)}</b><br>${escapeHtml(formatDistance(p.distance))}・${escapeHtml(surplusText)}`
      );
      marker.on('click', () => {
        scrollToCard(p.id);
        setActiveCard(p.id);
      });
      state.parkingMarkers.set(p.id, marker);
    });
  }

  function fitMapToResults() {
    const points = [[state.destination.lat, state.destination.lng]];
    state.parkingMarkers.forEach((m) => {
      const ll = m.getLatLng();
      points.push([ll.lat, ll.lng]);
    });
    if (points.length === 1) {
      state.map.setView(points[0], 15);
    } else {
      state.map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    }
  }

  // ---------- 互動：清單 ↔ 地圖 ----------
  function focusOnParking(id) {
    const marker = state.parkingMarkers.get(id);
    const item = state.nearby.find((p) => p.id === id);
    if (item) {
      state.map.setView([item.lat, item.lng], 17, { animate: true });
    }
    if (marker) marker.openPopup();
    setActiveCard(id);
  }

  function setActiveCard(id) {
    state.activeId = id;
    els.list.querySelectorAll('.parking-card').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }

  function scrollToCard(id) {
    const el = els.list.querySelector(`.parking-card[data-id="${CSS.escape(id)}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- 啟動 ----------
  document.addEventListener('DOMContentLoaded', init);
})();
