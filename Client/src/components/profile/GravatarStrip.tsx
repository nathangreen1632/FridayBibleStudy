import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore.ts';
import GravatarAvatar from './GravatarAvatar.tsx';
import GravatarModal from '../../modals/GravatarModalLogic.tsx';

export default function GravatarStrip(): React.ReactElement | null {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!user?.email) return null;

  return (
    <>
      <div
        className="w-full px-4 py-2 flex justify-end"
        style={{ background: 'var(--theme-strip)', color: 'var(--theme-strip-text)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="leading-tight text-right whitespace-nowrap">
            <div className="text-sm opacity-80">Logged In As</div>
            <div className="text-sm font-semibold">
              <span
                className="text-sm sm:text-lg font-semibold"
              >
                {user.name}
              </span>
            </div>
          </div>

          <GravatarAvatar email={user.email} name={user.name} size={60} />

          <button
            type="button"
            onClick={() => { try { setOpen(true); } catch {} }}
            className="inline-flex items-center justify-center rounded-full p-1 hover:opacity-80 focus:outline-none cursor-pointer"
            aria-label="Update avatar via Gravatar"
            title="Update avatar"
          >
            <Info className="w-4 h-4" color="var(--theme-error)" />
          </button>
        </div>
      </div>

      <GravatarModal isOpen={open} onClose={() => { try { setOpen(false); } catch {} }} />
    </>
  );
}
