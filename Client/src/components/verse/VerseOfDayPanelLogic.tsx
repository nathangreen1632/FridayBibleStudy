import React, { useEffect, useState } from 'react';
import { fetchVerseOfDay } from '../../helpers/api/bibleApi.ts';
import { useAuthStore } from '../../stores/useAuthStore.ts';
import { pickPassage } from '../../utils/bible.util.ts';
import VerseOfDayPanelView from '../../jsx/shared/verseOfDayPanelView.tsx';

export default function VerseOfDayPanelLogic(): React.ReactElement {
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
        // @ts-ignore runtime guard only
        const body = typeof res?.json === 'function' ? await res.json() : res;

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

    // ✅ Avoid “uncaught promise” / no-floating-promises
    void load();

    return () => { cancelled = true; };
  }, [user?.preferredBibleId]);

  return (
    <VerseOfDayPanelView
      html={html}
      refText={refText}
      loading={loading}
    />
  );
}
