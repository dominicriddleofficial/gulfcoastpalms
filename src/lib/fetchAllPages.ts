/**
 * Read every row of a query, 1000 at a time, so lists are never silently cut
 * off at the Data API's default row limit. `page(from, to)` must return the
 * same ordered query with `.range(from, to)` applied.
 */
export const PAGE_SIZE = 1000;
export const MAX_ROWS = 50_000;

export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
  throw new Error(`More than ${MAX_ROWS} rows; narrow the date range.`);
}
