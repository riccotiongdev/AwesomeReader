export interface Folder {
  id: string;
  name: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  unread_count?: number;
}

export interface Feed {
  id: string;
  folder_id?: string | null;
  title: string;
  feed_url: string;
  site_url?: string | null;
  icon_url?: string | null;
  etag?: string | null;
  last_modified?: string | null;
  last_fetched_at?: string | null;
  status: 'active' | 'error' | 'paused';
  error_message?: string | null;
  created_at: string;
  unread_count?: number;
}

export interface Article {
  id: string;
  feed_id: string;
  guid: string;
  title: string;
  author?: string | null;
  url: string;
  published_at: string;
  summary?: string | null;
  content?: string | null;
  full_content?: string | null;
  image_url?: string | null;
  thumbnail_fetched?: boolean;
  is_read: boolean;
  is_starred: boolean;
  read_at?: string | null;
  starred_at?: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  cover: Blob | null;
  blob: Blob;
  added_at: string;
  /** 0..1 reading progress — written by the reader (ticket 05); null = never opened. */
  progress: number | null;
  /** Engine location token for resuming — written by the reader (ticket 05). */
  location: string | null;
}

export interface OPMLFeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  text?: string;
}

export interface OPMLFolder {
  name: string;
  feeds: OPMLFeed[];
}

export interface OPMLStructure {
  title?: string;
  folders: OPMLFolder[];
  rootFeeds: OPMLFeed[];
}

export interface FeedFetchResult {
  feedTitle: string;
  siteUrl?: string;
  etag?: string;
  lastModified?: string;
  articles: Array<{
    guid: string;
    title: string;
    author?: string;
    url: string;
    publishedAt: string;
    summary?: string;
    content?: string;
    image_url?: string | null;
  }>;
}
