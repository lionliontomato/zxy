# 小亦の歌單網站

本版已依照你的要求修正：

- 網站設定以 Google 試算表 H / I 欄為主。
- H 欄是設定名稱，I 欄是設定內容。
- `網頁小標題` / `網站小標題` 都可讀取。
- 小標題不再寫死預設文字；I 欄改什麼，網站就讀什麼。
- 如果 I 欄留空，網站小標題就會留空，不會跳回舊文字。
- 已加強 cache busting，避免讀到舊版 `script.js` 或舊試算表資料。
- 桌機版歌單卡片固定四首一行；平板三欄/兩欄，手機一欄。
- 背景使用指定的電腦版與手機版圖片：
  - `assets/bg-desktop.png`
  - `assets/bg-mobile.png`
- 漂浮物為明顯往上飄的音符、星星、愛心與光點。
- 版權第一行已修正為：`© 2026 LionLionTomato. All Rights Reserved.`

## H / I 欄設定範例

| H 欄設定名稱 | I 欄設定內容 |
|---|---|
| 網站標題 或 網頁標題 | 小亦の歌單 |
| 網站小標題 或 網頁小標題 | 依你的 I 欄內容顯示；留空就不顯示 |
| 隨機抽歌按鈕 | 隨機抽歌 |
| 搜尋提示文字 | 搜尋歌名、歌手或分類… |
| 抽歌視窗標題 | 小亦推薦 |
| 關閉按鈕文字 | 好聽愛聽 |
| 版權第一行 | © 2026 LionLionTomato. All Rights Reserved. |

## 上傳方式

將本資料夾內的 `index.html`、`style.css`、`script.js`、`copyright.html`、`assets` 一起上傳到 GitHub Pages 專案即可。
