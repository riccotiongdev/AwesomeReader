-- AwesomeReader PostgreSQL Database Schema

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'folder',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  feed_url TEXT UNIQUE NOT NULL,
  site_url TEXT,
  icon_url TEXT,
  etag TEXT,
  last_modified TEXT,
  last_fetched_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'paused')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  summary TEXT,
  content TEXT,
  full_content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  starred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_feed_guid UNIQUE(feed_id, guid)
);

-- Indexes for high-performance reading & filtering queries
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_read_status ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_starred_status ON articles(is_starred);
