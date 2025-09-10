import React from 'react';
import { useAdminStore } from '../../stores/admin/useAdminStore';

export default function AdminRosterPager(): React.ReactElement {
  const {
    rosterTotal,
    rosterPage,
    rosterPageSize,
    nextRosterPage,
    prevRosterPage,
    setRosterPage,
  } = useAdminStore();

  const totalPages = Math.max(1, Math.ceil((rosterTotal || 0) / (rosterPageSize || 1)));
  const canPrev = rosterPage > 1;
  const canNext = rosterPage < totalPages;

  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <div>Total: {rosterTotal}</div>

      <div className="flex items-center gap-2">
        <button
          onClick={prevRosterPage}
          disabled={!canPrev}
          className="rounded-lg border px-3 py-1 disabled:opacity-50 hover:bg-[var(--theme-button-hover)]"
        >
          Prev
        </button>

        <div className="flex items-center gap-2">
          <span>Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={rosterPage}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) void setRosterPage(Math.min(Math.max(1, n), totalPages));
            }}
            className="w-16 px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)]"
          />
          <span>/ {totalPages}</span>
        </div>

        <button
          onClick={nextRosterPage}
          disabled={!canNext}
          className="rounded-lg border px-3 py-1 disabled:opacity-50 hover:bg-[var(--theme-button-hover)]"
        >
          Next
        </button>
      </div>
    </div>
  );
}
