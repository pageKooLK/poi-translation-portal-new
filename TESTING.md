# POI Translation Portal - Testing Guide

本文件提供完整的測試指南，用於驗證整合資料庫後的功能。

## 前置準備

### 1. 確認 Supabase 連線

```bash
# 檢查環境變數
cat .env.local | grep SUPABASE

# 應該看到：
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 2. 啟動開發伺服器

```bash
npm run dev
# 或如果有 port 衝突
PORT=3001 npm run dev
```

瀏覽器開啟: http://localhost:3000 (或 3001)

## 測試案例

### Test Case 1: 單一 POI 建立與翻譯流程

**目的**: 驗證單一 POI 建立、翻譯、資料庫儲存的完整流程

**步驟**:
1. 點擊 "Add POI" tab
2. 填寫表單：
   - Klook ID: `test001`
   - POI Name: `東京晴空塔`
   - Google Place ID: `ChIJN1t_tDeuEmsRUsoyG83frY4`
   - Country: `Japan` (或 `JP`)
3. 點擊 "Submit POI"
4. 觀察進度日誌，應該看到：
   - ✅ "POI created in database"
   - 🚀 "開始處理 1 個 POI 的翻譯"
   - 📍 "處理 POI 1/1: 東京晴空塔"
   - 各語言的翻譯進度 (ZH-CN, ZH-TW, JA-JP, etc.)
   - 💾 "儲存 東京晴空塔 的翻譯到資料庫..."
   - ✅ "成功儲存 14 筆翻譯"
   - 🎉 或 ⚠️ (根據是否需要人工檢查)

**驗證**:
- [ ] POI 出現在 "Translation Results" tab
- [ ] 所有 14 種語言都有翻譯狀態
- [ ] ZH-CN 和 ZH-TW 的翻譯完成 (非 "Processing...")
- [ ] 資料庫中有該 POI 記錄 (在 Supabase Dashboard 檢查 `pois` table)
- [ ] 資料庫中有 14 筆翻譯記錄 (`translations` table)
- [ ] 每筆翻譯有對應的 sources (`translation_sources` table)

---

### Test Case 2: CSV 批次上傳

**目的**: 驗證 CSV 批次上傳、資料庫儲存、批次翻譯

**步驟**:
1. 點擊 "Upload CSV" tab
2. 下載 CSV 範本 (點擊 "Download CSV Template")
3. 編輯範本，新增 3-5 個 POI：
   ```csv
   klook_id,poi_name,google_place_id,country_code
   test002,台北101,ChIJrTLr-GyuEmsRBfy61i59si0,TW
   test003,首爾塔,ChIJ2eUgeAK6j4ARbn5u_wAGqWA,KR
   test004,曼谷大皇宮,ChIJWUKpEW-a4jARZxRY3WJXyhg,TH
   ```
4. 上傳 CSV 檔案
5. 觀察上傳結果統計
6. 等待翻譯完成 (可能需要幾分鐘)

**驗證**:
- [ ] 上傳成功，顯示正確的成功/重複/錯誤數量
- [ ] 所有 POI 都出現在 "Translation Results" tab
- [ ] 資料庫中有所有 POI 記錄
- [ ] 每個 POI 都有 14 種語言的翻譯
- [ ] 進度日誌顯示每個 POI 的處理狀態
- [ ] 所有翻譯都儲存到資料庫

---

### Test Case 3: CSV 匯出功能

**目的**: 驗證 CSV export 包含所有 14 種語言

**步驟**:
1. 確保有一些已完成翻譯的 POI
2. 到 "Translation Results" tab
3. 選擇 Export Format: "CSV"
4. 點擊 "Export Results"
5. 開啟下載的 CSV 檔案

**驗證**:
- [ ] CSV 包含所有基本欄位: `klook_id, poi_name, country, status`
- [ ] CSV 包含所有 14 種語言欄位: `ZH-CN, ZH-TW, JA-JP, KO-KR, TH-TH, VI-VN, ID-ID, MS-MY, EN-US, EN-GB, FR-FR, DE-DE, IT-IT, PT-BR`
- [ ] 欄位順序正確
- [ ] 翻譯文字正確顯示（無亂碼）
- [ ] 空翻譯顯示為空白，不是 "null"

---

### Test Case 4: 資料持久化 (Reload 測試)

**目的**: 驗證資料從資料庫正確載入

**步驟**:
1. 建立幾個 POI 並等待翻譯完成
2. 重新整理頁面 (F5 或 Cmd+R)
3. 觀察 Console log

**驗證**:
- [ ] Console 顯示 "[DEBUG] Loading POIs from database..."
- [ ] Console 顯示 "[DEBUG] Loaded X POIs from database"
- [ ] 所有 POI 正確顯示在 UI
- [ ] 翻譯狀態正確（completed/manual_review/processing）
- [ ] 可以查看翻譯詳情（sources, reasoning）

---

### Test Case 5: 錯誤處理 - 重複 POI

**目的**: 驗證重複 POI 的錯誤處理

**步驟**:
1. 建立一個 POI (例如: `test005`)
2. 嘗試再次建立相同 Klook ID 的 POI
3. 上傳包含重複 Klook ID 的 CSV

**驗證**:
- [ ] 單一建立：顯示錯誤訊息 "POI with this Klook ID already exists"
- [ ] CSV 上傳：顯示 duplicate count，不會建立重複 POI
- [ ] 資料庫中沒有重複記錄

---

### Test Case 6: POI 刪除

**目的**: 驗證 POI 刪除功能（cascade delete）

**步驟**:
1. 選擇一個已完成翻譯的 POI
2. 點擊刪除按鈕
3. 確認刪除
4. 檢查 Supabase Dashboard

**驗證**:
- [ ] POI 從 UI 移除
- [ ] 資料庫 `pois` table 中該 POI 已刪除
- [ ] 資料庫 `translations` table 中該 POI 的所有翻譯已刪除 (cascade)
- [ ] 資料庫 `translation_sources` table 中對應的 sources 已刪除 (cascade)

---

### Test Case 7: 翻譯狀態分類

**目的**: 驗證不同翻譯狀態的正確分類

**步驟**:
1. 建立多個 POI，等待翻譯完成
2. 觀察不同狀態的 POI
3. 使用 "Filter by Status" 篩選

**驗證**:
- [ ] "Completed" 狀態：所有語言翻譯一致，無需人工檢查
- [ ] "Manual Review" 狀態：某些語言翻譯不一致，需要人工檢查
- [ ] "Processing" 狀態：翻譯進行中
- [ ] 篩選功能正確顯示對應狀態的 POI

---

### Test Case 8: Manual Check Queue

**目的**: 驗證需要人工檢查的翻譯會加入 queue

**步驟**:
1. 建立 POI 並等待翻譯完成
2. 如果有 "Manual Review" 狀態的 POI
3. 到 Supabase Dashboard 檢查 `manual_check_queue` table

**驗證**:
- [ ] 需要人工檢查的語言出現在 queue
- [ ] metadata 包含 similarity_score 和 sources
- [ ] priority 正確設定
- [ ] (Optional) "Manual Check" tab 顯示待處理任務

---

### Test Case 9: 翻譯手動編輯

**目的**: 驗證手動編輯翻譯並記錄到 edit_history

**步驟**:
1. 點擊某個 POI 的翻譯查看詳情
2. 點擊編輯按鈕
3. 修改翻譯文字
4. 儲存
5. 檢查 Supabase `edit_history` table

**驗證**:
- [ ] 翻譯文字更新
- [ ] `translations` table 中的記錄已更新
- [ ] `edit_history` table 有新記錄
- [ ] edit_history 記錄包含: old_value, new_value, action='manual_edit'
- [ ] 如果該語言在 manual check queue，已從 queue 移除

---

### Test Case 10: 混合策略 (Hybrid Strategy)

**目的**: 驗證 localStorage + Database 混合策略

**步驟**:
1. 建立一些 POI
2. 開啟 DevTools > Application > Local Storage
3. 檢查 `poi-translation-results` key
4. 重新整理頁面
5. 暫時關閉網路（DevTools > Network > Offline）
6. 再次重新整理

**驗證**:
- [ ] 資料同時存在 localStorage 和資料庫
- [ ] 正常情況下從資料庫載入
- [ ] 資料庫載入失敗時，從 localStorage fallback
- [ ] localStorage 自動與最新狀態同步

---

## 常見問題排解

### 問題 1: 翻譯卡在 "Processing..."

**可能原因**:
- API timeout
- 資料庫連線失敗
- 缺少某些語言的處理

**檢查**:
- 查看 Console log 是否有錯誤
- 檢查 Network tab 的 API 請求狀態
- 確認 API keys 正確設定 (OPENAI_API_KEY, SERP_API_KEY, PERPLEXITY_API_KEY)

### 問題 2: CSV export 資料為空

**可能原因**:
- 沒有符合篩選條件的 POI
- 資料未正確載入

**檢查**:
- 確認 "Filter by Status" 設定為 "All POIs"
- 確認有翻譯完成的 POI
- 查看 Console log

### 問題 3: 資料庫連線錯誤

**可能原因**:
- Supabase 環境變數錯誤
- Supabase RLS policies 設定問題

**檢查**:
```bash
# 檢查環境變數
cat .env.local | grep SUPABASE

# 測試 Supabase 連線
curl -X GET "YOUR_SUPABASE_URL/rest/v1/pois" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 問題 4: TypeScript 建置錯誤

**解決**:
```bash
# 清除快取並重新建置
rm -rf .next
npm run build
```

---

## 效能測試

### 批次翻譯效能

**測試規模**:
- 10 POIs: 應在 5-10 分鐘內完成
- 50 POIs: 應在 20-30 分鐘內完成
- 100 POIs: 可能需要 40-60 分鐘

**監控指標**:
- API timeout 頻率
- 資料庫寫入延遲
- 前端 UI 響應性

---

## 資料庫檢查 SQL

在 Supabase SQL Editor 執行以下查詢：

```sql
-- 檢查所有 POI 數量
SELECT COUNT(*) as total_pois FROM pois;

-- 檢查翻譯數量（應該是 pois 數量 × 14）
SELECT COUNT(*) as total_translations FROM translations;

-- 檢查需要人工檢查的翻譯
SELECT COUNT(*) as manual_review_count
FROM translations
WHERE needs_manual_check = true;

-- 檢查每個 POI 的翻譯完成度
SELECT
  p.klook_poi_id,
  p.klook_poi_name,
  COUNT(t.id) as translation_count,
  SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_count
FROM pois p
LEFT JOIN translations t ON p.id = t.poi_id
GROUP BY p.id, p.klook_poi_id, p.klook_poi_name;

-- 檢查 translation sources
SELECT
  COUNT(*) as total_sources,
  source_type,
  COUNT(*) as count_by_type
FROM translation_sources
GROUP BY source_type;

-- 檢查 manual check queue
SELECT COUNT(*) as pending_tasks FROM manual_check_queue;

-- 檢查 edit history
SELECT COUNT(*) as total_edits FROM edit_history;
```

---

## 成功標準

所有測試案例通過後，系統應達到以下標準：

✅ **功能完整性**
- 單一 POI 建立與翻譯流程正常
- CSV 批次上傳流程正常
- 所有 14 種語言都能正確處理
- CSV export 包含所有語言

✅ **資料持久化**
- POI 資料正確儲存到資料庫
- 翻譯資料正確儲存到資料庫
- 頁面重新整理後資料正確載入
- localStorage 作為 fallback 機制運作正常

✅ **錯誤處理**
- 重複 POI 正確檢測
- API timeout 正確處理
- 資料庫連線錯誤有 fallback

✅ **資料完整性**
- Cascade delete 正常運作
- Foreign key constraints 正確設定
- 沒有孤立的翻譯記錄

✅ **使用者體驗**
- 進度顯示準確
- 狀態更新即時
- 錯誤訊息清晰
- 載入速度合理
