// Client/src/modals/GravatarModal.tsx
import React from 'react';

const gravatarRegisterLink =
  'https://wordpress.com/log-in/link?client_id=1854&redirect_to=https%3A%2F%2Fpublic-api.wordpress.com%2Foauth2%2Fauthorize%3Fclient_id%3D1854%26response_type%3Dcode%26blog_id%3D0%26state%3D5a6405af107423f72b2a15f84382dda31954b049b870ed9dcb4ebb6ccc15cc5f%26redirect_uri%3Dhttps%253A%252F%252Fgravatar.com%252Fconnect%252F%253Faction%253Drequest_access_token%26gravatar_from%3Dsignup%26from-calypso%3D1&gravatar_from=signup';

const mainPage = 'https://gravatar.com/';

export default function GravatarModal(props: Readonly<{
  isOpen: boolean;
  onClose: () => void;
}>): React.ReactElement | null {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-[var(--theme-surface)] text-[var(--theme-text)] p-6 rounded-xl max-w-sm w-full shadow-[0_0_25px_2px_var(--theme-shadow)] relative">
        <button
          onClick={() => { try { props.onClose(); } catch {} }}
          className="absolute top-3 right-4 text-[var(--theme-border-red)] cursor-pointer text-xl font-bold hover:opacity-80 focus:outline-none"
          aria-label="Close"
          type="button"
        >
          &times;
        </button>

        <h2 className="text-lg font-bold mb-2 text-center text-[var(--theme-border-red)]">Update Your Gravatar</h2>

        <p className="text-sm mb-4">
          Your avatar is powered by Gravatar. To change it, register or log in with
          the email linked to your account.
        </p>

        <a
          href={gravatarRegisterLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Gravatar in a new tab"
          className="block w-full px-4 py-2.5 rounded-md bg-[var(--theme-button)] hover:bg-[var(--theme-hover)] text-base text-[var(--theme-text-white)] text-center shadow cursor-pointer transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/60"
        >
          Open Gravatar
        </a>

        <p className="text-xs mt-3">
          Learn more on their{' '}
          <a
            href={mainPage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--theme-error)] underline hover:opacity-90"
          >
            Main Page
          </a>.
        </p>
      </div>
    </div>
  );
}
