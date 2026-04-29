import { useEffect, useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Collapsible "what is this page for?" panel that sits below the page title.
 * Each instance has a stable id; the open/closed state persists in
 * localStorage under `page-help:<id>` so a user only has to collapse it
 * once per device.
 */
export function PageHelp({
  id,
  title,
  description,
  tips,
}: {
  id: string;
  title: string;
  description: string;
  tips?: string[];
}) {
  const storageKey = `page-help:${id}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === 'closed') setOpen(false);
    } catch {
      // localStorage unavailable; keep default
    }
  }, [storageKey]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? 'open' : 'closed');
    } catch {
      // ignore
    }
  }

  return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-xl">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
      >
        <HelpCircle className="h-4 w-4 text-blue-700 shrink-0" />
        <span className="text-sm font-medium text-blue-900 flex-1">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-blue-700" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-700" />
        )}
      </button>
      <div
        className={cn(
          'px-4 pb-3 pl-10 text-sm text-blue-900/90 space-y-2',
          !open && 'hidden',
        )}
      >
        <p>{description}</p>
        {tips && tips.length > 0 && (
          <ul className="list-disc pl-5 space-y-1">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
