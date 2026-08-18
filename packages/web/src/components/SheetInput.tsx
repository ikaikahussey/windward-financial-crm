import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SheetInputProps {
  value: string | null | undefined;
  onCommit: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Spreadsheet-style cell: looks like plain text until focused, saves on
 * blur (or Enter) only if the value actually changed.
 */
export function SheetInput({ value, onCommit, type = 'text', placeholder, className }: SheetInputProps) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  return (
    <input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== (value ?? '')) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value ?? '');
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        'w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40',
        className,
      )}
    />
  );
}
