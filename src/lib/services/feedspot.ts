import { clientFetchText } from '../network/http-client';

export interface FeedspotCategory {
  id: string;
  name: string;
  icon: string;
  path: string;
}

export interface RecommendedFeed {
  title: string;
  feedUrl: string;
  siteUrl: string;
  category: string;
  description: string;
}

export const FEATURED_CATEGORIES: FeedspotCategory[] = [
  { id: 'tech', name: 'Technology & AI', icon: '💻', path: 'https://rss.feedspot.com/tech_rss_feeds/' },
  { id: 'news', name: 'World & Local News', icon: '🌍', path: 'https://rss.feedspot.com/world_news_rss_feeds/' },
  { id: 'automotive', name: 'Automotive & EVs', icon: '🚗', path: 'https://rss.feedspot.com/car_rss_feeds/' },
  { id: 'finance', name: 'Finance & Crypto', icon: '📈', path: 'https://rss.feedspot.com/finance_rss_feeds/' },
  { id: 'gaming', name: 'Gaming & Esport', icon: '🎮', path: 'https://rss.feedspot.com/gaming_rss_feeds/' },
  { id: 'design', name: 'Design & UX', icon: '🎨', path: 'https://rss.feedspot.com/design_rss_feeds/' },
  { id: 'science', name: 'Science & Health', icon: '🔬', path: 'https://rss.feedspot.com/science_rss_feeds/' },
  { id: 'travel', name: 'Travel & Culture', icon: '✈️', path: 'https://rss.feedspot.com/travel_rss_feeds/' },
];

export const POPULAR_DIRECTORY_FEEDS: RecommendedFeed[] = [
  {
    title: 'TechCrunch',
    feedUrl: 'https://techcrunch.com/feed/',
    siteUrl: 'https://techcrunch.com',
    category: 'tech',
    description: 'Startup and technology news, reviews, and analysis.',
  },
  {
    title: 'Ars Technica',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    siteUrl: 'https://arstechnica.com',
    category: 'tech',
    description: 'Original reporting, analysis, and tech policy news.',
  },
  {
    title: 'The Verge',
    feedUrl: 'https://www.theverge.com/rss/index.xml',
    siteUrl: 'https://www.theverge.com',
    category: 'tech',
    description: 'Technology, science, art, and culture coverage.',
  },
  {
    title: 'Malaysiakini',
    feedUrl: 'https://www.malaysiakini.com/rss/en/news.rss',
    siteUrl: 'https://www.malaysiakini.com',
    category: 'news',
    description: 'Independent news, politics, and current affairs in Malaysia.',
  },
  {
    title: 'Paul Tan\'s Automotive News',
    feedUrl: 'https://paultan.org/feed/',
    siteUrl: 'https://paultan.org',
    category: 'automotive',
    description: 'Malaysia & ASEAN car news, test drives, and EV reviews.',
  },
  {
    title: 'Bloomberg Markets',
    feedUrl: 'https://feeds.bloomberg.com/markets/news.rss',
    siteUrl: 'https://www.bloomberg.com',
    category: 'finance',
    description: 'Financial markets, stock news, and global economy.',
  },
  {
    title: 'CoinDesk',
    feedUrl: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    siteUrl: 'https://www.coindesk.com',
    category: 'finance',
    description: 'Bitcoin, Ethereum, crypto markets, and Web3 trends.',
  },
  {
    title: 'IGN All News',
    feedUrl: 'https://feeds.feedburner.com/ign/all',
    siteUrl: 'https://www.ign.com',
    category: 'gaming',
    description: 'Video game reviews, trailers, walkthroughs, and news.',
  },
  {
    title: 'Smashing Magazine',
    feedUrl: 'https://www.smashingmagazine.com/feed/',
    siteUrl: 'https://www.smashingmagazine.com',
    category: 'design',
    description: 'Web development, UI/UX design, and frontend engineering.',
  },
  {
    title: 'Scientific American',
    feedUrl: 'https://services.scientificamerican.com/page/rss.cfm',
    siteUrl: 'https://www.scientificamerican.com',
    category: 'science',
    description: 'Science news, space exploration, physics, and discovery.',
  },
];

export async function fetchFeedspotCategories(): Promise<FeedspotCategory[]> {
  try {
    const html = await clientFetchText('https://rss.feedspot.com/');
    const matches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const parsedCategories: FeedspotCategory[] = [];

    for (const m of matches) {
      const href = m[1];
      const name = m[2].replace(/<[^>]*>?/gm, '').trim();
      if (name && (href.includes('rss') || href.includes('blogs') || href.includes('news'))) {
        const fullPath = href.startsWith('http') ? href : `https://rss.feedspot.com${href}`;
        parsedCategories.push({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          icon: '📌',
          path: fullPath,
        });
      }
    }

    if (parsedCategories.length > 0) {
      return parsedCategories.slice(0, 24);
    }
  } catch (err) {
    console.warn('Live Feedspot category fetch note:', err);
  }

  return FEATURED_CATEGORIES;
}
