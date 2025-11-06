/**
 * Book Search Service
 * Searches the web for book metadata including word count and genre
 */

interface BookSearchResult {
  wordCount: number | null;
  genres: string[];
}

interface DuckDuckGoResponse {
  AbstractText?: string;
  RelatedTopics?: Array<{ Text?: string }>;
}

interface OpenLibraryBook {
  subject?: string[];
  number_of_pages?: number;
  first_publish_year?: number;
  title?: string;
  author_name?: string[];
}

interface OpenLibraryResponse {
  docs?: OpenLibraryBook[];
  numFound?: number;
}

/**
 * Searches for book information (word count and genre) using web search
 * @param title - Book title
 * @param author - Book author
 * @returns Promise with word count and genres, or null values on failure
 */
export async function searchBookInfo(
  title: string,
  author: string
): Promise<BookSearchResult> {
  const result: BookSearchResult = {
    wordCount: null,
    genres: [],
  };

  try {
    // First, try Open Library API - most reliable source for book metadata
    try {
      console.log(`Searching Open Library for: "${title}" by ${author}`);
      const olResults = await searchOpenLibraryForBookInfo(title, author);
      if (olResults.wordCount) {
        result.wordCount = olResults.wordCount;
        console.log(`Found word count: ${olResults.wordCount}`);
      }
      if (olResults.genres.length > 0) {
        result.genres = olResults.genres;
        console.log(`Found genres: ${olResults.genres.join(', ')}`);
      }
    } catch (error) {
      console.error('Open Library search failed:', error);
    }

    // If we still don't have word count, try ReadingLength.com (secondary scraper)
    if (!result.wordCount) {
      try {
        const readingLengthWordCount = await fetchWordCountFromReadingLength(title, author);
        if (readingLengthWordCount) {
          result.wordCount = readingLengthWordCount;
          console.log(`ReadingLength word count: ${readingLengthWordCount}`);
        }
      } catch (error: any) {
        console.error('ReadingLength scrape failed:', error?.message || error);
      }
    }

    // If we still don't have word count, try DuckDuckGo Instant Answer API
    if (!result.wordCount) {
      try {
        const searchQuery = `${title} ${author} book`;
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(ddgUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; LibraryTracker/1.0)',
            },
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = (await response.json()) as DuckDuckGoResponse;

            // Try to extract genre from AbstractText
            if (data.AbstractText && result.genres.length === 0) {
              const abstract = data.AbstractText.toLowerCase();
              result.genres = extractGenresFromText(abstract);
            }
          }
        } catch (fetchError: any) {
          if (fetchError.name !== 'AbortError') {
            console.error(`DuckDuckGo search error:`, fetchError.message);
          }
        }
      } catch (error) {
        // Silently fail
      }
    }

    // If we still don't have word count, try web search fallback
    if (!result.wordCount) {
      try {
        const webResults = await searchWebForBookInfo(title, author);
        if (webResults.wordCount) {
          result.wordCount = webResults.wordCount;
        }
        if (webResults.genres.length > 0 && result.genres.length === 0) {
          result.genres = webResults.genres;
        }
      } catch (error) {
        // Silently fail
      }
    }
  } catch (error: any) {
    console.error(`Failed to search book info for ${title} by ${author}:`, error.message);
  }

  return result;
}

/**
 * Search web for book information using general search
 */
async function searchWebForBookInfo(
  title: string,
  author: string
): Promise<BookSearchResult> {
  const result: BookSearchResult = {
    wordCount: null,
    genres: [],
  };

  try {
    // Use a search query that targets book information sites
    const searchQuery = `${title} ${author} word count pages genre`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LibraryTracker/1.0)',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();

        // Try to extract word count directly from SERP text/snippets
        const serpWordCount = extractWordCountFromHtml(html);
        if (serpWordCount) {
          result.wordCount = serpWordCount;
          console.log(`DuckDuckGo SERP word count: ${serpWordCount}`);
        }

        // Extract genres from snippets (fallback)
        const serpGenres = extractGenresFromText(html);
        if (serpGenres.length > 0 && result.genres.length === 0) {
          result.genres = serpGenres;
        }

        // If still missing word count, follow top organic results and inspect their content
        if (!result.wordCount) {
          const candidateUrls = extractDuckDuckGoResultUrls(html);
          for (const url of candidateUrls) {
            const pageWordCount = await fetchWordCountFromUrl(url);
            if (pageWordCount) {
              result.wordCount = pageWordCount;
              console.log(`DuckDuckGo result word count from ${url}: ${pageWordCount}`);
              break;
            }
          }
        }
      }
    } catch (fetchError: any) {
      if (fetchError.name !== 'AbortError') {
        console.error('Web search error:', fetchError.message);
      }
    }
  } catch (error) {
    // Silently fail - this is a fallback method
  }

  return result;
}

/**
 * Search Open Library API for book information (word count and genre)
 */
async function searchOpenLibraryForBookInfo(
  title: string,
  author: string
): Promise<BookSearchResult> {
  const result: BookSearchResult = {
    wordCount: null,
    genres: [],
  };

  try {
    // Try multiple search strategies
    const searchQueries = [
      `title:${title} author:${author}`,
      `"${title}" "${author}"`,
      `${title} ${author}`,
    ];

    for (const searchQuery of searchQueries) {
      const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=3`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(searchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LibraryTracker/1.0)',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as OpenLibraryResponse;
          if (data.docs && data.docs.length > 0) {
            // Find the best match (exact title/author match)
            const bestMatch = data.docs.find((book) => {
              const bookTitle = book.title?.toLowerCase() || '';
              const bookAuthors = book.author_name?.map(a => a.toLowerCase()) || [];
              const searchTitle = title.toLowerCase();
              const searchAuthor = author.toLowerCase();
              
              const titleMatches = bookTitle.includes(searchTitle) || searchTitle.includes(bookTitle);
              const authorMatches = bookAuthors.some(a => a.includes(searchAuthor) || searchAuthor.includes(a));
              
              return titleMatches && authorMatches;
            }) || data.docs[0];

            // Extract genres from subjects
            if (bestMatch.subject) {
              result.genres = extractGenresFromSubjects(bestMatch.subject);
            }

            // Estimate word count from page count (average 250-300 words per page)
            if (bestMatch.number_of_pages && !result.wordCount) {
              const pages = bestMatch.number_of_pages;
              // Estimate: 250 words per page for fiction, 300 for non-fiction
              // Using 275 as a middle ground
              const estimatedWords = pages * 275;
              result.wordCount = estimatedWords;
              console.log(`Estimated word count from Open Library: ${pages} pages = ${estimatedWords} words`);
            }

            // If we found both, we're done
            if (result.wordCount && result.genres.length > 0) {
              break;
            }
          }
        }
      } catch (fetchError: any) {
        if (fetchError.name !== 'AbortError') {
          console.error('Open Library API error:', fetchError.message);
        }
        // Continue to next search query
      }
    }
  } catch (error) {
    // Silently fail
  }

  return result;
}

/**
 * Extract genres from text content
 */
function extractGenresFromText(text: string): string[] {
  const genres: string[] = [];
  const commonGenres = [
    'fiction',
    'non-fiction',
    'fantasy',
    'sci-fi',
    'science fiction',
    'mystery',
    'thriller',
    'romance',
    'horror',
    'adventure',
    'biography',
    'autobiography',
    'memoir',
    'history',
    'historical fiction',
    'young adult',
    'children',
    'drama',
    'comedy',
    'poetry',
    'dystopian',
    'realistic fiction',
    'graphic novel',
    'comic',
    'manga',
    'classic',
    'literary fiction',
    'contemporary',
    'humor',
    'action',
    'suspense',
    'crime',
    'detective',
  ];

  const lowerText = text.toLowerCase();

  for (const genre of commonGenres) {
    // Check if genre appears in text (with word boundaries)
    const regex = new RegExp(`\\b${genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      // Capitalize first letter of each word
      const formatted = genre
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      genres.push(formatted);
    }
  }

  return genres.slice(0, 5); // Limit to 5 genres
}

/**
 * Extract genres from Open Library subjects
 */
function extractGenresFromSubjects(subjects: string[]): string[] {
  const genres: string[] = [];
  const genreKeywords = [
    'fiction',
    'fantasy',
    'science fiction',
    'mystery',
    'thriller',
    'romance',
    'horror',
    'adventure',
    'biography',
    'history',
    'young adult',
    'children',
    'drama',
  ];

  for (const subject of subjects) {
    const lowerSubject = subject.toLowerCase();
    for (const keyword of genreKeywords) {
      if (lowerSubject.includes(keyword)) {
        const formatted = keyword
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        if (!genres.includes(formatted)) {
          genres.push(formatted);
        }
      }
    }
  }

  return genres.slice(0, 5);
}

/**
 * Extract word count from an HTML string
 */
function extractWordCountFromHtml(html: string): number | null {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  return extractWordCountFromText(text);
}

/**
 * Apply multiple heuristics to extract a word count from plain text snippets
 */
function extractWordCountFromText(text: string): number | null {
  const patterns: RegExp[] = [
    /word\s*count\s*[:\-]?\s*(\d[\d,.]*)/i,
    /about\s*(\d[\d,.]*)\s*words?/i,
    /approximately\s*(\d[\d,.]*)\s*words?/i,
    /(?:is|has|contains|totals?)\s*(\d[\d,.]*)\s*words?/i,
    /(\d[\d,.]*)\s*(?:words?)(?:\s*(?:long|novel|book|story))?/i,
    /(\d+(?:\.\d+)?)\s*(?:million|m)\s*words?/i,
    /(\d+(?:\.\d+)?)\s*(?:thousand|k)\s*words?/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      if (Number.isNaN(value)) {
        continue;
      }

      const lower = match[0].toLowerCase();
      if (lower.includes('million') || /\bm\b/.test(lower)) {
        value *= 1_000_000;
      } else if (lower.includes('thousand') || /\bk\b/.test(lower)) {
        value *= 1_000;
      }

      if (value >= 1_000 && value <= 15_000_000) {
        return Math.round(value);
      }
    }
  }

  return null;
}

/**
 * Extract top organic result URLs from the DuckDuckGo HTML response
 */
function extractDuckDuckGoResultUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const matches = html.matchAll(/href="https:\/\/duckduckgo\.com\/l\/?\?uddg=([^"&]+)"/gi);

  for (const match of matches) {
    if (!match[1]) continue;

    try {
      const decoded = decodeURIComponent(match[1]);
      if (!decoded.startsWith('http')) {
        continue;
      }

      const normalized = decoded.split('&', 1)[0];
      const url = normalized;
      if (shouldSkipUrl(url) || seen.has(url)) {
        continue;
      }

      seen.add(url);
      urls.push(url);

      if (urls.length >= 5) {
        break;
      }
    } catch (error) {
      // Ignore decoding errors
    }
  }

  return urls;
}

/**
 * Fetch a page and attempt to extract a word count from its contents
 */
async function fetchWordCountFromUrl(url: string): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LibraryTracker/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    return extractWordCountFromHtml(html);
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.error(`Failed to fetch ${url}:`, error.message || error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Skip URLs that are unlikely to provide word counts (e.g., commerce sites)
 */
function shouldSkipUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    const skipDomains = [
      'amazon.',
      'audible.',
      'barnesandnoble.',
      'target.',
      'walmart.',
      'books.google.',
      'play.google.',
      'bing.com',
      'yahoo.com',
      'ebay.',
    ];

    return skipDomains.some((domain) => hostname.includes(domain));
  } catch (error) {
    return true;
  }
}

/**
 * Fetch word count data from ReadingLength.com (if available)
 */
async function fetchWordCountFromReadingLength(title: string, author: string): Promise<number | null> {
  // Build a search query combining title and author for better accuracy
  const query = `${title} ${author}`.trim();
  const searchUrl = `https://www.readinglength.com/search?q=${encodeURIComponent(query)}`;

  const searchHtml = await fetchReadingLengthPage(searchUrl);
  if (!searchHtml) {
    return null;
  }

  const titleSlug = extractReadingLengthTitleSlug(searchHtml);
  if (!titleSlug) {
    return null;
  }

  const detailUrl = `https://www.readinglength.com${titleSlug}`;
  const detailHtml = await fetchReadingLengthPage(detailUrl);
  if (!detailHtml) {
    return null;
  }

  const wordCount = extractWordCountFromHtml(detailHtml);
  if (wordCount) {
    return wordCount;
  }

  // Some ReadingLength pages display page count; convert to estimated words
  const pageCount = extractPageCountFromReadingLength(detailHtml);
  if (pageCount) {
    return Math.round(pageCount * 275);
  }

  return null;
}

async function fetchReadingLengthPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LibraryTracker/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        Referer: 'https://www.readinglength.com/',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }

    return await response.text();
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.error(`ReadingLength request failed for ${url}:`, error?.message || error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractReadingLengthTitleSlug(html: string): string | null {
  // ReadingLength search results typically include links like /title/<slug>
  const linkRegex = /href="(\/title\/[^"]+)"/gi;
  const matches = html.matchAll(linkRegex);

  for (const match of matches) {
    const href = match[1];
    if (!href) continue;
    if (href.startsWith('/title/')) {
      return href.split('?')[0];
    }
  }

  return null;
}

function extractPageCountFromReadingLength(html: string): number | null {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  // Look for "XX pages" or "XX page"
  const pagePattern = /(\d{1,4})\s+pages?/i;
  const match = pagePattern.exec(text);
  if (match) {
    const pages = parseInt(match[1], 10);
    if (!Number.isNaN(pages) && pages > 0 && pages < 5000) {
      return pages;
    }
  }

  return null;
}

