import axios from 'axios';

const BASE_URL = 'https://ak.sv';
const HEADERS = {
  'Referer': 'https://ak.sv/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export interface MediaItem {
  title: string;
  url: string;
  image: string;
  rating?: string;
  quality?: string;
}

async function fetchPage(url: string) {
  try {
    const response = await axios.get(url, { headers: HEADERS });
    return response.data;
  } catch (error) {
    console.error(`Error fetching page ${url}:`, error);
    throw new Error('فشل في جلب الصفحة من المصدر');
  }
}

function extractItems(html: string): MediaItem[] {
  const items: MediaItem[] = [];
  
  // Regex to match the col-6 cards in Akwam
  const cardRegex = /<div class="col-6[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[1];
    
    const titleMatch = cardHtml.match(/<h3 class="entry-title[^>]*><a[^>]*>(.*?)<\/a><\/h3>/) || cardHtml.match(/<a[^>]*class="entry-title[^>]*>(.*?)<\/a>/);
    const urlMatch = cardHtml.match(/<a href="([^"]+)"/);
    const imgMatch = cardHtml.match(/<img[^>]*src="([^"]+)"/) || cardHtml.match(/<img[^>]*data-src="([^"]+)"/);
    const ratingMatch = cardHtml.match(/<span class="rating[^>]*>(.*?)<\/span>/);
    const qualityMatch = cardHtml.match(/<span class="quality[^>]*>(.*?)<\/span>/);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const url = urlMatch ? urlMatch[1] : '';
    let image = imgMatch ? imgMatch[1] : '';
    const rating = ratingMatch ? ratingMatch[1].trim() : '';
    const quality = qualityMatch ? qualityMatch[1].trim() : '';

    if (title && url) {
      items.push({ title, url, image, rating, quality });
    }
  }

  // إذا لم يعثر على نتائج بهذا النمط، نبحث بنمط أبسط (النتائج المتنوعة)
  if (items.length === 0) {
    const linkRegex = /<div class="entry-image">\s*<a href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*data-src="([^"]+)"/g;
    let fallbackMatch;
    while ((fallbackMatch = linkRegex.exec(html)) !== null) {
      items.push({
        title: 'عنصر',
        url: fallbackMatch[1],
        image: fallbackMatch[2]
      });
    }
  }

  return items;
}

export async function getMovies(page: number = 1): Promise<MediaItem[]> {
  const html = await fetchPage(`${BASE_URL}/movies?page=${page}`);
  return extractItems(html);
}

export async function getSeries(page: number = 1): Promise<MediaItem[]> {
  const html = await fetchPage(`${BASE_URL}/series?page=${page}`);
  return extractItems(html);
}

export async function search(keyword: string): Promise<MediaItem[]> {
  const html = await fetchPage(`${BASE_URL}/search?q=${encodeURIComponent(keyword)}`);
  return extractItems(html);
}

export async function getSeriesEpisodes(seriesUrl: string) {
  const html = await fetchPage(seriesUrl);
  const episodes: MediaItem[] = [];

  // #series-episodes .bg-primary2 h2 a
  const epSectionMatch = html.match(/id="series-episodes"([\s\S]*?)<\/section>/);
  if (epSectionMatch) {
    const epSection = epSectionMatch[1];
    const epRegex = /<a href="([^"]+)".*?>\s*([\s\S]*?)\s*<\/a>/g;
    let match;
    while ((match = epRegex.exec(epSection)) !== null) {
      const url = match[1];
      let title = match[2].replace(/<[^>]+>/g, '').trim(); // إزالة أي وسوم HTML داخلية
      if (title && url && url.includes('/episode/')) {
        episodes.push({ title, url, image: '' });
      }
    }
  }

  if (episodes.length === 0) {
    // محاولة نمط أبسط
    const simpleRegex = /<h2 class="font-size-16 text-white mb-0"><a href="([^"]+)">(.*?)<\/a><\/h2>/g;
    let match;
    while ((match = simpleRegex.exec(html)) !== null) {
      episodes.push({ title: match[2].trim(), url: match[1], image: '' });
    }
  }

  return episodes.reverse();
}

export async function getCleanLink(pageUrl: string) {
  try {
    const html = await fetchPage(pageUrl);
    
    let directUrls: { url: string; quality: string }[] = [];
    
    const jsonMatch = html.match(/downloadLinks\s*:\s*(\[[\s\S]*?\])/) || html.match(/data\.downloadLinks\s*=\s*(\[[\s\S]*?\])/);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        const downloadLinks = JSON.parse(jsonMatch[1].replace(/'/g, '"'));
        downloadLinks.forEach((link: any) => {
          if (link.directUrl || link.url) {
            let rawUrl = link.directUrl || link.url;
            const cleanUrl = rawUrl.replace(/^(https:\/\/ak\.svvlc:\/\/|intent:\/\/|intent:|vlc:\/\/)/i, '');
            directUrls.push({
              quality: link.quality || 'Unknown',
              url: cleanUrl
            });
          }
        });
      } catch (e) {
        console.error('Failed to parse downloadLinks JSON:', e);
      }
    }

    if (directUrls.length === 0) {
      const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>.*?<\/a>/g;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        let url = match[1];
        if (url.includes('downet.net') || url.includes('.mp4') || url.includes('.m3u8')) {
           url = url.replace(/^(https:\/\/ak\.svvlc:\/\/|intent:\/\/|intent:|vlc:\/\/)/i, '');
           directUrls.push({ quality: 'Unknown', url });
        }
      }
    }

    const uniqueLinks = Array.from(new Map(directUrls.map(item => [item.url, item])).values());
    return uniqueLinks;
  } catch (error) {
    console.error(`Error getting links for ${pageUrl}:`, error);
    throw new Error('فشل في استخراج الروابط من الصفحة');
  }
}
