# 開發進度

> 規範：每做完一件事就更新這份檔案，然後 commit 並 push。

## 目前階段

試敏表頁完成並上線（https://wsturkey6-hash.github.io/babyfoodie/ ），下一步做紀錄頁。

## 已完成

- 2026-09-19　建立 GitHub repo（公開），寫入專案規範 CLAUDE.md
- 2026-09-19　用 ui-ux-pro-max 做 3 個設計選項（design/options.html），使用者選定 B 貼紙手帳風；頁面已用 web-design-guidelines 檢查並修正
- 2026-09-19　確定規格，寫成 SPEC.md
- 2026-09-19　新增規範 5：Claude 當 supervisor，寫程式可依難度分派給 Sonnet／Haiku subagent，最後由 supervisor 審查
- 2026-09-19　與使用者逐月核對試敏表食材清單（共 118 項，刪除籠統的「青菜」），確定依編號排序，更新 SPEC.md
- 2026-09-19　網站骨架：三個頁面（index / table / baby.html）、共用樣式 css/style.css、圖示 assets/icons.svg、底部分頁列、頁首「設定寶寶資料」提示。樣式由 Sonnet、頁面由 Haiku 撰寫，supervisor 審查；已用 web-design-guidelines 檢查並修正（標題 text-wrap、分頁 hover／按下回饋）。開啟 GitHub Pages

- 2026-09-19　寶寶頁：名字、生日表單（驗證、儲存、離開前提醒），每頁頁首顯示寶寶名字和月齡（js/core.js、js/baby.js）。程式與測試由 Sonnet、樣式由 Sonnet、HTML 由 Haiku 撰寫，supervisor 審查；月齡計算有 18 項自動測試；已用 web-design-guidelines 檢查並修正（名字加 translate="no"、iOS 日期欄位靠左）

- 2026-09-19　試敏表頁：118 項依月齡分區、三種狀態、點食材跳出選單改狀態、標示並自動捲到目前月齡、月份跳轉列、「其他」區提示（js/foods.js 由 SPEC.md 產生、js/table.js）。資料與 HTML 由 Haiku、程式與測試由 Sonnet、樣式由 Sonnet 撰寫，supervisor 審查修正：資料檔錯字（砠瓜→瓠瓜）、儲存失敗時還原狀態、選項字級、跳轉列焦點外框、遮罩後備色、目前月齡貼紙對比；自動測試 40 項（含資料檔與 SPEC.md 逐項比對）；已用 web-design-guidelines 檢查

## 下一步

1. 紀錄頁
2. 匯出／匯入備份
