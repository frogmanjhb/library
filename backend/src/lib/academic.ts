/**
 * Get current academic term and year.
 * Calendar year. Term 1: Jan–Apr, Term 2: May–Aug, Term 3: Sep–Dec.
 */
export function getCurrentTermAndYear(): { term: number; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (month >= 9) {
    return { term: 3, year };
  }
  if (month >= 5) {
    return { term: 2, year };
  }
  return { term: 1, year };
}
