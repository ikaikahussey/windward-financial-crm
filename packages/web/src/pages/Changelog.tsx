import { CHANGELOG } from '@/lib/changelog';
import { format } from 'date-fns';
import { GitCommit } from 'lucide-react';

export default function Changelog() {
  const live = __APP_VERSION__;
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Changelog</h1>
        <p className="text-sm text-gray-500 mt-1">
          Currently in production:{' '}
          <a
            href={`https://github.com/anthropics/windward-financial-crm/commit/${live}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-primary hover:underline"
          >
            {live}
          </a>{' '}
          · built {format(new Date(__APP_BUILD_DATE__), 'PPpp')}
        </p>
      </div>

      <ol className="space-y-6">
        {CHANGELOG.map((entry) => {
          const isLive = entry.version === live;
          return (
            <li
              key={entry.version}
              className="bg-white rounded-xl shadow-sm border border-sand-dark p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <GitCommit className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="font-semibold text-primary-dark">{entry.title}</h2>
                    {isLive && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        live
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-mono">{entry.version}</span> · {entry.date}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm text-gray-700 list-disc pl-5">
                {entry.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
