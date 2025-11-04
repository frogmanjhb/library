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

