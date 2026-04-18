# 🅿️ 桃園停車場查詢

> ⚠️ **此專案目前暫緩開發。**
>
> 原因：資料來源覆蓋率不足。桃園市政府開放資料 API 的 SSL 憑證失效導致無法從瀏覽器/Cloudflare Workers 存取；改用交通部 TDX 平台後發現資料不完整（例如南苑停車場等非市府管轄的停車場均未收錄）。要達到 Google Maps 等級的覆蓋率，只能付費使用 Google Places API，或自行長期維護資料，目前評估投入效益不成比例，故暫停。
>
> 現有程式碼與部署架構已完成並可運作，僅停車場資料本身不夠齊全。待有更好的資料來源時會再恢復開發。

---

## 線上 Demo

部署於 GitHub Pages：**https://chisato010101.github.io/parking-app/**

## 已實作功能

- 🔍 地名搜尋（透過 OpenStreetMap Nominatim）
- 📍 「使用我目前的位置」一鍵搜尋附近停車場
- 🗺️ Leaflet 地圖顯示目的地與最近 10 個停車場
- 🟢 即時剩餘車位顏色標示（綠／黃／紅／無資料）
- 💰 顯示收費標準、地址、充電車位資訊
- 🧭 點擊「導航」直接開啟 Google Maps 路線規劃
- ⭐ 點擊「Google Maps 查看」可看評分／評論／街景
- 🎛️ 過濾「只顯示有車位的」、依距離或剩餘車位排序
- 📱 手機優先設計，支援桌機 RWD

## 使用的服務 / 技術

### 前端
- **HTML5 + CSS3 + Vanilla JavaScript**（無框架、免編譯）
- **Leaflet.js** — 開源地圖元件
- **OpenStreetMap** — 圖磚資料

### 外部 API
- **Nominatim API**（OpenStreetMap 提供）— 地名 → 經緯度
- **交通部 TDX 運輸資料流通服務平臺** — 停車場靜態資料與即時剩餘車位
- **Google Maps URL Scheme** — 跳轉導航／地點查看（免費、不需要 API Key）

### 雲端架構
- **GitHub** — 原始碼託管
- **GitHub Pages** — 前端靜態網頁託管
- **GitHub Actions** — 自動部署 pipeline
- **Cloudflare Workers** — CORS proxy

## 資料來源

- 🚗 路外停車資訊：[交通部 TDX 運輸資料流通服務平臺](https://tdx.transportdata.tw/)
- 🗺️ 地圖圖磚：[© OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- 📍 地名搜尋：[Nominatim](https://nominatim.org/)

## 本地執行

```bash
cd parking-app
python3 -m http.server 8000

# 或用 Node
npx serve .
```

接著開啟 <http://localhost:8000>。

## 已知限制

- **資料覆蓋率不足**：TDX 平台僅收錄各地方政府登記的公有停車場，私人停車場、水利署或其他機關所轄停車場（如石門水庫、觀光景點停車場）不在其中
- Nominatim 對地名不熟時可能查不到，建議搭配「縣市 + 地名」
- `surplusSpace = -1` 代表停車場未連線即時系統

## 授權

MIT License
