import React, { useEffect, useState } from 'react';
import { fetchVerseOfDay } from '../helpers/api/bibleApi';
import { useAuthStore } from '../stores/useAuthStore';

type PassageItem = {
  content?: string;
  reference?: string;
};

function pickPassage(body: any): PassageItem | null {
  // Current server shape: { ok: true, data: { data: [ { content, reference, ... } ], meta: {...} } }
  const newItem = body?.data?.data?.[0];
  if (newItem?.content || newItem?.reference) return newItem;

  // Legacy/alt shape: { ok: true, data: { passages: [ { content, reference } ] } }
  const oldItem = body?.data?.passages?.[0];
  if (oldItem?.content || oldItem?.reference) return oldItem;

  // Provider raw body (in case someone wires the helper directly to api.bible)
  const rawItem = body?.data?.[0];
  if (rawItem?.content || rawItem?.reference) return rawItem;

  return null;
}

export default function VerseOfDayPanel(): React.ReactElement {
  const { user } = useAuthStore();
  const [html, setHtml] = useState('');
  const [refText, setRefText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetchVerseOfDay(user?.preferredBibleId ?? undefined);

        // Support both: helper returns Response OR already-parsed JSON
        // @ts-ignore — runtime guard, not for types
        const body = typeof res?.json === 'function' ? await res.json() : res;

        // Dev aid: uncomment if you want to confirm the shape live
        // console.debug('[VOD] body →', body);

        const picked = pickPassage(body);
        const content = picked?.content ?? '';
        const reference = picked?.reference ?? '';

        if (!cancelled) {
          setHtml(content);
          setRefText(reference);
        }
      } catch {
        if (!cancelled) {
          setHtml('');
          setRefText('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.preferredBibleId]);

  return (
    <div
      className={[
        'relative mt-4',
        'w-full mx-auto px-3 sm:px-4 md:px-0',
        'max-w-4xl 2xl:max-w-[80rem]',
        'sticky top-4',
        'min-[1440px]:static min-[1440px]:w-auto min-[1440px]:max-w-none min-[1440px]:mx-0 min-[1440px]:px-0',
      ].join(' ')}
    >
      <aside
        aria-label="Verse of the Day"
        className={[
          'w-full rounded-2xl bg-[var(--theme-surface)]/80 backdrop-blur',
          'border border-[var(--theme-border)] shadow-md',
          'px-3 py-3',
          'min-[1440px]:fixed min-[1440px]:left-4 min-[1440px]:top-1/2 min-[1440px]:-translate-y-1/2',
          'min-[1440px]:inset-x-auto min-[1440px]:bottom-auto',
          'min-[1440px]:px-4 min-[1440px]:py-4 min-[1440px]:w-64',
          'min-[1440px]:max-h-[70vh] min-[1440px]:overflow-auto custom-scrollbar',
          'text-[var(--theme-text)]', // make sure text color contrasts
        ].join(' ')}
      >
        <div className="font-semibold mb-2">Verse of the Day</div>
        {loading && <div>Loading…</div>}
        {!loading && !html && <div>Unavailable.</div>}
        {html && (
          <>
            {refText && (
              <div className="text-sm mb-2 opacity-80 select-none">{refText}</div>
            )}
            <div className="scripture-styles">
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
