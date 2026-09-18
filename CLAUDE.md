# babyfoodie — 專案規範

紀錄寶寶開始嘗試副食品的網頁，介面語言為繁體中文。
規格見 [SPEC.md](SPEC.md)，進度見 [PROGRESS.md](PROGRESS.md)。

## 工作規範（每次都必須遵守）

1. **不猜測**：有不知道、不確定的地方，不要自己猜，先跟使用者討論再動手。
2. **設計**：這是母嬰產品。設計一律使用 `ui-ux-pro-max` skill，風格為「休閒活潑」、暖色調；遇到設計決策時，先推薦幾個選項讓使用者選。
3. **檢查**：網頁每次調整完，都要用 `web-design-guidelines` skill 檢查，並修正檢查出的問題。
4. **進度**：每做完一件事，就更新 PROGRESS.md 記錄當前進度，然後 commit 並 push 到 GitHub。
5. **分工**：Claude 是 supervisor。寫程式時可以依難度開 subagent 分派工作：較複雜的交給 Sonnet、簡單的交給 Haiku；subagent 做完後一律由 supervisor 審查。

## 專案資訊

- GitHub：https://github.com/wsturkey6-hash/babyfoodie （公開 repo）
- 技術：純 HTML / CSS / JavaScript，不用框架、不需要建置
- 部署：GitHub Pages
- 資料：存在使用者瀏覽器本機（localStorage），不會進 repo
- 設計：貼紙手帳風，細節見 SPEC.md「設計」
