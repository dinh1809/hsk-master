# 🚀 Setup Authentication & Personalization

## Bước 1: Chạy SQL Migration trong Supabase

1. Mở **Supabase Dashboard** → Chọn project của bạn
2. Vào **SQL Editor** (menu bên trái)
3. Copy toàn bộ nội dung file `supabase_migration_auth.sql`
4. Paste vào SQL Editor và click **Run**
5. Kiểm tra xem các bảng đã được tạo:
   - `user_progress`
   - `personal_decks`

## Bước 2: Enable Email Authentication

1. Vào **Authentication** → **Providers** (menu bên trái)
2. Tìm **Email** provider
3. **Enable** nó (toggle switch)
4. (Optional) Disable "Confirm Email" nếu bạn muốn test nhanh mà không cần verify email

## Bước 3: (Optional) Enable Google OAuth

1. Vẫn ở **Authentication** → **Providers**
2. Tìm **Google** provider
3. Click **Enable**
4. Bạn cần:
   - Google Cloud Console Client ID
   - Google Cloud Console Client Secret
5. Follow hướng dẫn của Supabase để setup Google OAuth

## Bước 4: Test Authentication

1. Chạy app: `npm run dev`
2. Bạn sẽ thấy màn hình đăng nhập đẹp mắt
3. Thử **Sign Up** với email + password
4. Sau khi đăng ký, bạn sẽ được redirect vào Dashboard
5. Click **Logout** để test sign out

## 🎯 Next Steps: Sync Progress to Database

Hiện tại app đã có:
- ✅ Authentication (Login/Logout)
- ✅ Protected Routes (chỉ user đăng nhập mới vào được)
- ✅ Database Schema (user_progress, personal_decks)

**Chưa có:**
- ❌ Lưu tiến độ học tập vào database
- ❌ Hiển thị progress bar thực tế từ database
- ❌ Personal decks (deck tự tạo)

Để implement phần này, chúng ta cần:
1. Update `FlashcardSession` để save progress sau mỗi card
2. Update `Dashboard` để fetch và hiển thị progress thực tế
3. (Optional) Thêm chức năng tạo Personal Deck

---

## 📝 Notes

- **Row Level Security (RLS)** đã được enable → Mỗi user chỉ thấy data của mình
- **Policies** đã được tạo → `auth.uid() = user_id`
- **Indexes** đã được tạo → Query sẽ nhanh hơn
- **Auto-update timestamps** → `updated_at` tự động cập nhật

## 🔒 Security Checklist

- [x] RLS enabled on all tables
- [x] Policies restrict access to own data only
- [x] Email auth enabled
- [ ] (Optional) Email verification enabled
- [ ] (Optional) Google OAuth configured
