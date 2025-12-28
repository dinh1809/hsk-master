# 🚀 Push to GitHub - Hướng dẫn

## Bước 1: Cài đặt Git

1. Tải Git từ: https://git-scm.com/download/win
2. Cài đặt với các tùy chọn mặc định
3. Restart terminal/VS Code sau khi cài

## Bước 2: Cấu hình Git

```bash
# Mở terminal mới và chạy:
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Bước 3: Tạo Repository trên GitHub

1. Đi đến https://github.com/new
2. Đặt tên repository: `hsk-master` (hoặc tên bạn muốn)
3. **KHÔNG** tick "Add a README file" (vì chúng ta đã có)
4. Click "Create repository"

## Bước 4: Push code lên GitHub

Mở terminal trong thư mục project (`white-viking`) và chạy:

```bash
# Khởi tạo Git repository
git init

# Thêm tất cả files
git add .

# Commit lần đầu
git commit -m "Initial commit: HSK Master flashcard app"

# Thêm remote (thay YOUR_USERNAME bằng username GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/hsk-master.git

# Push lên GitHub
git branch -M main
git push -u origin main
```

## Nếu gặp lỗi Authentication

Nếu GitHub yêu cầu đăng nhập:

1. **Option 1: Personal Access Token**
   - Đi đến GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token với quyền `repo`
   - Sử dụng token này thay vì password

2. **Option 2: GitHub CLI**
   ```bash
   # Cài GitHub CLI
   winget install GitHub.cli
   
   # Đăng nhập
   gh auth login
   
   # Push
   git push -u origin main
   ```

## ✅ Xong!

Sau khi push xong, code sẽ có trên:
`https://github.com/YOUR_USERNAME/hsk-master`

---

## Những gì sẽ được push

- ✅ Source code (src/)
- ✅ Package files (package.json)
- ✅ README.md
- ✅ SQL migrations
- ❌ node_modules (excluded by .gitignore)
- ❌ .env.local (excluded - contains secrets)
- ❌ dist/ (excluded - build output)
