# 🅿️ 桃園停車場查詢

一個純前端網頁應用，輸入目的地即可快速找到附近的停車場、即時剩餘車位、收費資訊，並一鍵跳轉 Google Maps 導航。

完全免費、無需註冊、不依賴任何需綁信用卡的 API。

## 線上試用

部署於 GitHub Pages：**https://chisato010101.github.io/parking-app/**

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

## 本地執行

```bash
cd parking-app
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

## 授權

MIT License
