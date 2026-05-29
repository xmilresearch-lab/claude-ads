export interface PaginatedResult<T> {
  items: T[];
  has_more: boolean;
  next_offset: number;
  total_count: number;
}

export function paginate<T>(
  items: T[],
  offset: number,
  limit: number,
  total: number
): PaginatedResult<T> {
  return {
    items,
    has_more: offset + items.length < total,
    next_offset: offset + items.length,
    total_count: total,
  };
}
