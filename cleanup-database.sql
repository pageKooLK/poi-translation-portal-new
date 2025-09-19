-- POI Translation Portal - 資料庫清理腳本
-- 在 Supabase SQL Editor 中執行此腳本以清除所有現有表格
-- ⚠️ 警告：此腳本將刪除所有資料，請確保您已備份重要資料

-- Step 1: 停用所有 RLS (Row Level Security) 政策
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 刪除所有 RLS 政策
    FOR r IN (SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations" ON %I.%I', r.schemaname, r.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I.%I', r.schemaname, r.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON %I.%I', r.schemaname, r.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update for users based on email" ON %I.%I', r.schemaname, r.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete for users based on email" ON %I.%I', r.schemaname, r.tablename);
        EXCEPTION
            WHEN OTHERS THEN
                -- 忽略錯誤，繼續處理下一個表
                NULL;
        END;
    END LOOP;
END $$;

-- Step 2: 刪除所有外鍵約束
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_name, r.conname);
        EXCEPTION
            WHEN OTHERS THEN
                -- 忽略錯誤，繼續處理
                NULL;
        END;
    END LOOP;
END $$;

-- Step 3: 刪除所有視圖
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', r.viewname);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END $$;

-- Step 4: 刪除所有函數
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE pg_namespace.nspname = 'public'
    ) LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %I(%s) CASCADE', r.proname, r.argtypes);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END $$;

-- Step 5: 刪除所有表格
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.tablename);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END $$;

-- Step 6: 刪除所有序列
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', r.sequencename);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END $$;

-- Step 7: 刪除所有自定義類型
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT typname 
        FROM pg_type 
        JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid 
        WHERE pg_namespace.nspname = 'public' 
        AND pg_type.typtype = 'e'  -- enum types
    ) LOOP
        BEGIN
            EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', r.typname);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END $$;

-- Step 8: 清理完成確認
SELECT 
    'Tables' as object_type, 
    COUNT(*) as remaining_count 
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Views' as object_type, 
    COUNT(*) as remaining_count 
FROM pg_views 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Functions' as object_type, 
    COUNT(*) as remaining_count 
FROM pg_proc 
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
WHERE pg_namespace.nspname = 'public'

UNION ALL

SELECT 
    'Sequences' as object_type, 
    COUNT(*) as remaining_count 
FROM pg_sequences 
WHERE schemaname = 'public';

-- 顯示清理結果訊息
SELECT '🧹 資料庫清理完成！' as status, 
       '所有表格、視圖、函數和序列已被刪除' as message,
       '現在可以執行 database-schema.sql 建立 POI Translation Portal 表格' as next_step;