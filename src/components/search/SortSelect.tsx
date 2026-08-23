'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui';

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <Select
      aria-label="Sort results"
      value={params.get('sort') ?? 'RECOMMENDED'}
      onChange={(event) => {
        const next = new URLSearchParams(params.toString());
        next.set('sort', event.target.value);
        router.push(`/search?${next.toString()}`, { scroll: false });
      }}
      className="h-9 w-auto min-w-44 text-[13px]"
    >
      <option value="RECOMMENDED">Recommended</option>
      <option value="PRICE_ASC">Price: low to high</option>
      <option value="PRICE_DESC">Price: high to low</option>
      <option value="RATING">Best rated</option>
      <option value="NEWEST">Newest listings</option>
    </Select>
  );
}
