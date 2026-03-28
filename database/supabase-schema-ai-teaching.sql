-- Supabase Database Schema for AI Teaching Platform
-- Exported: 2026-03-28
-- Project: sawbozdyrjkvzgxfawfa

-- =============================================
-- Core Tables
-- =============================================

-- Schools (學校)
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(50),
    logo_url TEXT,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users (用戶)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20),  -- 'admin', 'teacher', 'student', 'parent'
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subjects (科目)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Topics (主題/單元)
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES topics(id),
    grade_range VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Points (知識點)
CREATE TABLE IF NOT EXISTS knowledge_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Question Bank (題庫)
-- =============================================

-- Questions (題目)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id),
    subject_id UUID REFERENCES subjects(id),
    topic_id UUID REFERENCES topics(id),
    knowledge_point_id UUID REFERENCES knowledge_points(id),
    title TEXT,
    content JSONB NOT NULL,  -- 題目內容（支持 HTML/圖片）
    question_type VARCHAR(50),  -- 'choice', 'fill', 'calculation', 'question'
    difficulty VARCHAR(20),  -- 'easy', 'medium', 'hard'
    score INTEGER DEFAULT 10,
    is_ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    source_question_id UUID REFERENCES questions(id),
    answer JSONB,  -- 答案
    explanation TEXT,  -- 解釋
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'pending_review'  -- 'pending_review', 'approved', 'rejected'
);

-- =============================================
-- Worksheets (試卷)
-- =============================================

-- Worksheets (試卷主表)
CREATE TABLE IF NOT EXISTS worksheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id),
    grade VARCHAR(10),
    difficulty VARCHAR(20),
    content JSONB NOT NULL,  -- 試卷結構（題目順序、分數等）
    time_limit INTEGER,  -- 時間限制（分鐘）
    total_score INTEGER,
    is_template BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Worksheet-Question Relationship (試卷 - 題目關聯)
CREATE TABLE IF NOT EXISTS worksheet_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    sort_order INTEGER NOT NULL,
    score_override INTEGER,
    UNIQUE(worksheet_id, question_id)
);

-- =============================================
-- Students & Practice (學生與練習)
-- =============================================

-- Students (學生)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    school_id UUID REFERENCES schools(id),
    grade VARCHAR(10),
    class_name VARCHAR(50),
    student_number VARCHAR(50),
    parent_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Student Progress (學生進度)
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    subject_id UUID REFERENCES subjects(id),
    topic_id UUID REFERENCES topics(id),
    total_questions INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    accuracy_rate NUMERIC DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Practice Attempts (練習嘗試)
CREATE TABLE IF NOT EXISTS practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    worksheet_id UUID REFERENCES worksheets(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    time_spent INTEGER,  -- 花費時間（秒）
    score INTEGER,
    status VARCHAR(20)  -- 'in_progress', 'completed', 'abandoned'
);

-- Practice Answers (練習答案)
CREATE TABLE IF NOT EXISTS practice_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES practice_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    question_order INTEGER,
    answer JSONB,
    is_correct BOOLEAN,
    score INTEGER,
    time_taken INTEGER,  -- 答題時間（秒）
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Practice Assignments (練習作業)
CREATE TABLE IF NOT EXISTS practice_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worksheet_id UUID REFERENCES worksheets(id),
    assigned_by UUID REFERENCES users(id),
    student_ids UUID[],  -- 分配給哪些學生
    class_ids UUID[],    -- 分配給哪些班級
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'active', 'completed'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Achievements & Recommendations (成就與推薦)
-- =============================================

-- Achievements (成就)
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    badge_type VARCHAR(50),
    badge_name VARCHAR(100),
    earned_at TIMESTAMPTZ DEFAULT now()
);

-- AI Recommendations (AI 推薦)
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    type VARCHAR(50),  -- 'weak_topic', 'next_question', 'review'
    title VARCHAR(255),
    content TEXT,
    recommended_questions JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Indexes (索引優化)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_school ON questions(school_id);

CREATE INDEX IF NOT EXISTS idx_worksheets_subject ON worksheets(subject_id);
CREATE INDEX IF NOT EXISTS idx_worksheets_school ON worksheets(school_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_topic ON student_progress(topic_id);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_student ON practice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_worksheet ON practice_attempts(worksheet_id);

CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);

CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- Sample Data (示例數據)
-- =============================================

-- 科目 UUIDs (from MEMORY.md)
-- 數學：bf239e48-4f70-42a6-98b8-9651f4a8aaec
-- 英文：1f690e9e-f789-4bd9-832e-3c98baf5b198
-- 中文：4914e8db-9741-40ef-94ad-d9e945e2884a
-- 常識：114dcca3-2816-4f6f-99be-d82107179c99

-- =============================================
-- Notes (說明)
-- =============================================

-- 1. 所有 UUID 使用 gen_random_uuid() 自動生成
-- 2. 時間字段使用 TIMESTAMPTZ (帶時區)
-- 3. JSONB 用於存儲複雜結構（題目內容、答案等）
-- 4. 外鍵使用 ON DELETE CASCADE 自動清理關聯數據
-- 5. RLS (Row Level Security) 需要在 Supabase 控制台啟用
