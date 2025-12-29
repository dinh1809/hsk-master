# 🔧 Hướng Dẫn Fix RLS - Tách Dữ Liệu User

## Vấn Đề
Tất cả users đang share data vì RLS policies chưa hoạt động đúng.

## Giải Pháp

### Bước 1: Mở Supabase SQL Editor
Đi đến: https://supabase.com/dashboard/project/nmljpvoknogugywtrigz/sql

### Bước 2: Chạy Migration

Copy toàn bộ nội dung file [`supabase_migration_fix_rls.sql`](file:///c:/Users/Administrator/.gemini/antigravity/playground/white-viking/supabase_migration_fix_rls.sql) và paste vào SQL Editor, sau đó click **RUN**.

### Bước 3: Verify

Sau khi chạy xong, test lại app:
1. Đăng nhập với tài khoản A → học vài từ
2. Đăng xuất
3. Đăng nhập với tài khoản B → kiểm tra xem có thấy progress của A không

Nếu **KHÔNG** thấy progress của A thì đã thành công! ✅

---

## Nếu Vẫn Bị Lỗi

Nếu sau khi chạy migration mà vẫn share data, có thể do:

1. **Cache trong app** - Thử hard refresh (Ctrl+Shift+R)
2. **Old data trong database** - Có thể cần xóa data cũ:

```sql
-- XÓA TẤT CẢ PROGRESS CŨ (CẢNH BÁO: Mất hết dữ liệu)
TRUNCATE TABLE user_progress;
```

3. **RLS chưa enable** - Verify bằng query:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_progress', 'personal_decks');
```

Kết quả phải là `rowsecurity = true` cho cả 2 tables.

---

## Quick Fix Script (Nếu Cần)

Nếu bạn muốn xóa hết data cũ và bắt đầu lại:

```sql
-- 1. Xóa hết progress cũ
TRUNCATE TABLE user_progress CASCADE;

-- 2. Verify RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 3. Test
SELECT * FROM user_progress; -- Phải trả về empty
```
