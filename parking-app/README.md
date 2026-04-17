# 🅿️ 桃園停車場查詢

一個純前端網頁應用，輸入目的地（例如「南崁兒童藝術village」、「桃園火車站」），
即可快速找到附近的停車場、即時剩餘車位、收費資訊，並一鍵跳轉到 Google Maps
進行導航或查看評分／評論。

完全免費、無需註冊、不依賴任何需綁信用卡的 API。可直接部署到 GitHub Pages
等靜態網站託管服務。

## 功能截圖

> 截圖待補。

| 主畫面 | 搜尋結果 |
|--------|----------|
| _(預留)_ | _(預留)_ |

## 主要功能

- 🔍 地名搜尋（透過 OpenStreetMap Nominatim）
- 📍 「使用我目前的位置」一鍵搜尋附近停車場
- 🗺️ Leaflet 地圖顯示目的地與最近 10 個停車場
- 🟢 即時剩餘車位顏色標示（綠／黃／紅／無資料）
- 💰 顯示收費標準、地址、充電車位資訊
- 🧭 點擊「導航」直接開啟 Google Maps 路線規劃
- ⭐ 點擊「Google Maps 查看」可看評分／評論／街景
- 🎛️ 過濾「只顯示有車位的」、依距離或剩餘車位排序
- 📱 手機優先設計，支援桌機 RWD

## 使用的技術

- **HTML5 + CSS3 + Vanilla JavaScript**（無框架、免編譯）
- **Leaflet.js** — 開源地圖元件
- **OpenStreetMap** — 圖磚資料
- **Nominatim API** — 地名 → 經緯度
- **桃園市政府開放資料平台 API** — 路外停車場即時資訊
- **Google Maps URL Scheme** — 跳轉導航／地點查看（不使用 Google Maps API）

## 資料來源

- 🚗 路外停車資訊：[桃園市政府資料開放平台](https://data.tycg.gov.tw/)
  - 資料集 ID：`0daad6e6-0632-44f5-bd25-5e1de1e9146f`
- 🗺️ 地圖圖磚：[© OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- 📍 地名搜尋：[Nominatim](https://nominatim.org/)

特別感謝以上服務免費對公眾開放，讓本專案得以實現。

## 本地執行

本專案是純靜態頁面，但因瀏覽器對 `file://` 的 CORS 限制，
建議使用簡易 HTTP server 啟動：

```bash
# 使用 Python 3
cd parking-app
python3 -m http.server 8000

# 或用 Node
npx serve .
```

接著開啟 <http://localhost:8000>。

## 部署到 GitHub Pages

1. 將整個專案 push 到 GitHub repo
2. 進入 repo 的 **Settings → Pages**
3. 在 *Build and deployment* 選 *Deploy from a branch*
4. 選擇要部署的分支（例如 `main`）與資料夾（`/ (root)` 或 `/parking-app`）
5. 等待數分鐘後即可在 `https://<你的帳號>.github.io/<repo 名稱>/parking-app/` 開啟

> 若部署目錄是專案根目錄，可改放 `index.html` 到 root；本專案範例放在
> `parking-app/` 子目錄。

## 授權

MIT License — 詳見 [LICENSE](./LICENSE)（待加）

## Roadmap

- [ ] 加入機車停車場（如桃園市有開放對應資料集）
- [ ] 搜尋歷史紀錄（localStorage）
- [ ] 距離半徑切換 slider
- [ ] 載入中骨架屏
- [ ] PWA 支援、可離線使用基本資料
- [ ] 沿路線自動推薦停車場
- [ ] 多縣市資料整合（雙北、新竹等）

## 已知限制

- Nominatim 對地名不熟時可能查不到，建議搭配「縣市 + 地名」（如「桃園 南崁兒童藝術村」）
- 桃園開放資料 API 偶有延遲或欄位空值，UI 已做容錯處理
- `surplusSpace = -1` 代表停車場未連線即時系統，並非沒有車位
