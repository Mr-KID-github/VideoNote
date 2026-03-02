-- VideoNote Database Schema
-- Run this in Supabase SQL Editor to create the required tables

-- 1. 团队表
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. 文件夹表
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 笔记表
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '无标题',
  content TEXT DEFAULT '',
  video_url TEXT,
  source_type TEXT CHECK (source_type IN ('video', 'file')),
  task_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'done', 'failed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 分享链接表
CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  password TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 索引
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_folders_team ON folders(team_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_notes_folder ON notes(folder_id);
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_shared_links_note ON shared_links(note_id);

-- 7. RLS 策略 (Row Level Security)

-- Teams: owner can do anything, team members can read
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team owners can do everything" ON teams
  FOR ALL USING (auth.uid() = owner_id);

-- Team members: read access
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read" ON team_members
  FOR SELECT USING (auth.uid() = user_id);

-- Folders: owner and team members can access
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their folders" ON folders
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE tm.user_id = auth.uid() AND t.id = folders.team_id)
  );

-- Notes: owner and team members can access
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their notes" ON notes
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM folders f WHERE f.id = notes.folder_id AND f.team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()))
  );

-- Shared links: anyone with token can read
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone with token can read" ON shared_links
  FOR SELECT USING (true);

-- Notes for shared view (public)
CREATE POLICY "Public notes can be read" ON notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shared_links sl WHERE sl.note_id = notes.id)
  );
