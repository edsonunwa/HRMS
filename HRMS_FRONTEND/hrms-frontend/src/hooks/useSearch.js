import { useMemo } from 'react';
import { useSearchContext } from '../context/SearchContext';

/**
 * Filters `data` by the current global search query.
 * `keys` — array of dot-notation field paths to search, e.g. ['full_name', 'department_name']
 */
export function useSearch(data, keys) {
  const { query } = useSearchContext();
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !data?.length) return data || [];
    return data.filter((row) =>
      keys.some((key) => {
        const val = key.split('.').reduce((o, k) => o?.[k], row);
        return String(val ?? '').toLowerCase().includes(q);
      })
    );
  }, [data, keys, query]);
}
