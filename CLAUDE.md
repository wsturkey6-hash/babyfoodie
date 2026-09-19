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
- 部署：GitHub Pages，https://wsturkey6-hash.github.io/babyfoodie/ （push 到 main 後自動更新）
- 本機預覽：.claude/launch.json（python http.server，port 5500）
- 測試：在專案根目錄執行 `node --test`（Windows 上 `node --test tests/` 這種指定資料夾的寫法不能用）

## 資料結構（localStorage 的 `babyfoodie`）

```
{ version: 1,
  baby: { name, birthday: 'YYYY-MM-DD' } | null,
  marks: { [食材名稱]: 'untried' | 'tried' | 'reaction' },   // 試敏表上的手動標記
  records: [{ id, date: 'YYYY-MM-DD', time: 'HH:MM',
              foods: [食材名稱], firstFoods: [存檔時是第一次吃的食材],
              amount: { value, unit: '匙' | 'ml' | 'g' } | null,
              reactions: ['紅疹' | '腹瀉' | '嘔吐' | '便秘' | '脹氣'],
              note, createdAt, updatedAt }],
  customFoods: [食材名稱] }
```

- 食材以名稱當識別（118 項名稱不重複）。試敏表清單以 SPEC.md 為準，`js/foods.js` 必須與它完全一致（`tests/foods.test.js` 會檢查）。
- 食材狀態：有手動標記就用手動標記；否則只要有任何紀錄含這個食材就是「已嘗試」。
- 資料：存在使用者瀏覽器本機（localStorage），不會進 repo
- 設計：貼紙手帳風，細節見 SPEC.md「設計」
