-- =====================================================
-- MIGRATION: Personalized App with User Authentication
-- =====================================================
-- Run this in Supabase SQL Editor to enable user-specific data

-- 1. Bảng lưu tiến độ học tập (User Progress)
-- Lưu trạng thái từng từ: word_id, độ khó (easy/hard), ngày ôn tiếp theo
create table if not exists user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  deck_id text not null, -- VD: 'hsk1', 'hsk2'
  word_id text not null, -- VD: 'hsk1_001' hoặc 'local-123'
  
  -- SM-2 Algorithm fields (for spaced repetition)
  status text check (status in ('new', 'learning', 'reviewing', 'mastered')) default 'new',
  easiness_factor real default 2.5,
  interval integer default 0,
  repetitions integer default 0,
  next_review_at timestamp with time zone default now(),
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Đảm bảo mỗi user chỉ có 1 record cho mỗi từ
  unique(user_id, deck_id, word_id)
);

-- 2. Bảng lưu Deck cá nhân (Personal Decks)
-- Nếu user muốn tạo deck riêng, lưu thông tin deck vào đây
create table if not exists personal_decks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  level text default 'custom', -- 'custom', 'hsk1', 'hsk2', etc.
  words jsonb default '[]'::jsonb, -- Lưu danh sách từ vựng dạng JSON
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. BẬT BẢO MẬT (Row Level Security - Quan trọng nhất)
-- Chỉ cho phép user xem/sửa dữ liệu của chính mình
alter table user_progress enable row level security;
alter table personal_decks enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users manage their own progress" on user_progress;
drop policy if exists "Users manage their own decks" on personal_decks;

-- Create policies for user_progress
create policy "Users manage their own progress" on user_progress
  for all using (auth.uid() = user_id);

-- Create policies for personal_decks
create policy "Users manage their own decks" on personal_decks
  for all using (auth.uid() = user_id);

-- 4. Tạo indexes để tăng tốc queries
create index if not exists idx_user_progress_user_id on user_progress(user_id);
create index if not exists idx_user_progress_deck_id on user_progress(deck_id);
create index if not exists idx_user_progress_next_review on user_progress(next_review_at);
create index if not exists idx_personal_decks_user_id on personal_decks(user_id);

-- 5. Function để tự động update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for auto-updating timestamps
drop trigger if exists update_user_progress_updated_at on user_progress;
create trigger update_user_progress_updated_at
  before update on user_progress
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_personal_decks_updated_at on personal_decks;
create trigger update_personal_decks_updated_at
  before update on personal_decks
  for each row
  execute function update_updated_at_column();

-- =====================================================
-- DONE! Now enable Email Auth in Supabase Dashboard:
-- Authentication > Providers > Email (enable)
-- Optional: Enable Google OAuth for social login
-- =====================================================
