/**
 * Book Search Service
 * Searches the web for book metadata including word count and genre
 */

interface BookSearchResult {
  wordCount: number | null;
  genres: string[];
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
    // Use DuckDuckGo Instant Answer API for book information
    const searchQuery = `${title} ${author} book`;
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(ddgUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LibraryTracker/1.0)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Try to extract genre from AbstractText or related topics
      if (data.AbstractText) {
        const abstract = data.AbstractText.toLowerCase();
        result.genres = extractGenresFromText(abstract);
      }

      // Try to get more detailed information via web search fallback
      if (!result.wordCount || result.genres.length === 0) {
        const webResults = await searchWebForBookInfo(title, author);
        if (webResults.wordCount) {
          result.wordCount = webResults.wordCount;
        }
        if (webResults.genres.length > 0) {
          result.genres = [...new Set([...result.genres, ...webResults.genres])];
        }
      }
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        console.log(`Book search timed out for: ${title} by ${author}`);
      } else {
        console.error(`Book search error for ${title} by ${author}:`, fetchError.message);
      }
    }

    // Fallback: Try Open Library API for genre information
    if (result.genres.length === 0) {
      try {
        const olGenres = await searchOpenLibrary(title, author);
        if (olGenres.length > 0) {
          result.genres = olGenres;
        }
      } catch (error) {
        console.error('Open Library search failed:', error);
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
        
        // Extract word count from text (look for various patterns)
        // Patterns: "50,000 words", "50000 words", "50k words", "50 thousand words", "word count: 50000"
        const wordCountPatterns = [
          /(\d{1,3}(?:,\d{3})*)\s*(?:words?|word count)/i,
          /(\d+)\s*(?:k|thousand)\s*words?/i,
          /word\s*count[:\s]*(\d{1,3}(?:,\d{3})*)/i,
          /approximately\s*(\d{1,3}(?:,\d{3})*)\s*words?/i,
        ];

        for (const pattern of wordCountPatterns) {
          const match = html.match(pattern);
          if (match) {
            let wordCountStr = match[1].replace(/,/g, '');
            // Handle "k" notation (e.g., "50k" = 50000)
            if (match[0].toLowerCase().includes('k') && !match[0].toLowerCase().includes('thousand')) {
              wordCountStr = (parseInt(wordCountStr, 10) * 1000).toString();
            }
            const wordCount = parseInt(wordCountStr, 10);
            if (!isNaN(wordCount) && wordCount > 0 && wordCount < 10000000) {
              // Reasonable upper limit
              result.wordCount = wordCount;
              break;
            }
          }
        }

        // Extract genres from text
        const genres = extractGenresFromText(html);
        if (genres.length > 0) {
          result.genres = genres;
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
 * Search Open Library API for genre information
 */
async function searchOpenLibrary(
  title: string,
  author: string
): Promise<string[]> {
  try {
    const searchQuery = `title:${title} author:${author}`;
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LibraryTracker/1.0)',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.docs && data.docs.length > 0) {
          const book = data.docs[0];
          if (book.subject) {
            // Open Library returns subjects, which often include genres
            return extractGenresFromSubjects(book.subject);
          }
        }
      }
    } catch (fetchError: any) {
      if (fetchError.name !== 'AbortError') {
        console.error('Open Library API error:', fetchError.message);
      }
    }
  } catch (error) {
    // Silently fail
  }

  return [];
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

