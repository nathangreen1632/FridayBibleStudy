import React from 'react';
import { ChevronDown } from 'lucide-react';
import Modal from '../../modals/ModalLogic.tsx';
import ConfirmBar from '../../common/ConfirmBar.tsx';
import ProfileInfo from '../../components/profile/ProfileInfoLogic.tsx';
import MyPrayersColumn from '../../components/board/panels/MyPrayersColumnLogic.tsx';
import { pressBtn } from '../../../ui/press.ts';
import type { CategoryOption, PrayerDraft } from '../../types/admin/account.types.ts';

type Props = {
  user: object | null;
  loading: boolean;
  saving: boolean;
  posting: boolean;
  savedMsg: string | null;
  formDirty: boolean;
  confirmExit: boolean;
  prayer: PrayerDraft;
  setPrayer: (next: PrayerDraft) => void;
  isProfileOpen: boolean;
  openProfile: () => void;
  requestCloseProfile: () => void;
  confirmExitWithoutSaving: () => void;
  cancelExit: () => void;
  onSaveProfile: (values: Record<string, unknown>) => Promise<void>;
  postPrayer: (e: React.FormEvent) => Promise<void>;
  onDirtyChange: (v: boolean) => void;
};

export default function ProfileAccountView({
                                             user,
                                             loading,
                                             saving,
                                             posting,
                                             savedMsg,
                                             formDirty,
                                             confirmExit,
                                             prayer,
                                             setPrayer,
                                             isProfileOpen,
                                             openProfile,
                                             requestCloseProfile,
                                             confirmExitWithoutSaving,
                                             cancelExit,
                                             onSaveProfile,
                                             postPrayer,
                                             onDirtyChange,
                                           }: Readonly<Props>): React.ReactElement {
  if (!user) {
    return (
      <div className="min-h-[80vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-4 sm:p-6">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_4px_14px_0_var(--theme-shadow)] px-4 py-3 sm:px-6 sm:py-5 text-sm sm:text-base">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--theme-accent)]">Account</h1>
            <p className="opacity-80 text-sm sm:text-base">Manage your information and share prayers.</p>
          </div>
          <button
            type="button"
            onClick={openProfile}
            className={pressBtn(
              'rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] px-4 py-2 text-sm sm:text-base'
            )}
          >
            Edit My Profile
          </button>
        </header>

        <div className="relative isolate">
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute inset-0',
              'rounded-2xl bg-[var(--theme-surface)]',
              'border border-[var(--theme-border)]',
              'shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)]',
              'z-0',
              'transform-gpu scale-[1.015] sm:scale-[1.055]',
            ].join(' ')}
          />

          <section className="relative z-10 bg-[var(--theme-accent)] border border-[var(--theme-border)] rounded-2xl shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)] p-4 sm:p-6 md:p-8">
            <header className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl text-center font-semibold text-[var(--theme-text-white)]">
                Post a Prayer
              </h2>
              <p className="opacity-80 text-[var(--theme-text-white)] text-center text-sm sm:text-base">
                Share a prayer request or praise with the group
              </p>
            </header>

            <form className="space-y-4" onSubmit={postPrayer}>
              <label className="block text-xs sm:text-sm font-medium">
                <span className="text-sm text-[var(--theme-text-white)] sm:text-base mb-1 block">Title</span>
                <input
                  required
                  placeholder="Brief title"
                  value={prayer.title}
                  onChange={(e) => setPrayer({ ...prayer, title: e.target.value })}
                  className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                           text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/80"
                />
              </label>

              <label className="block text-xs sm:text-sm font-medium">
                <span className="text-sm text-[var(--theme-text-white)] sm:text-base mb-1 block">Category</span>

                <div className="relative">
                  <select
                    required
                    value={prayer.category}
                    onChange={(e) =>
                      setPrayer({ ...prayer, category: e.target.value as CategoryOption })
                    }
                    className={[
                      'block w-full appearance-none pr-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2',
                      'text-sm sm:text-base',
                      !prayer.category ? 'text-[var(--theme-placeholder)]/70' : 'text-[var(--theme-placeholder)]',
                      'focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]',
                    ].join(' ')}
                  >
                    <option value="">Select Prayer Type</option>
                    <option value="birth">Birth</option>
                    <option value="long-term">Long-term</option>
                    <option value="praise">Praise</option>
                    <option value="prayer">Prayer</option>
                    <option value="pregnancy">Pregnancy</option>
                    <option value="salvation">Salvation</option>
                  </select>

                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--theme-placeholder)]"
                    aria-hidden="true"
                  />
                </div>
              </label>

              <label className="block text-xs sm:text-sm font-medium">
                <span className="text-sm text-[var(--theme-text-white)] sm:text-base mb-1 block">Content</span>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your prayer or praise here…"
                  value={prayer.content}
                  onChange={(e) => setPrayer({ ...prayer, content: e.target.value })}
                  className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base leading-relaxed
                           text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/70 custom-scrollbar"
                />
              </label>

              <div className="pt-2">
                <button
                  className={pressBtn(
                    'w-full sm:w-auto rounded-xl bg-[var(--theme-surface)] px-5 py-2.5 text-[var(--theme-text)] text-sm sm:text-base font-semibold hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed'
                  )}
                  type="submit"
                  disabled={posting}
                >
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <MyPrayersColumn />

      <Modal
        open={isProfileOpen}
        onRequestClose={requestCloseProfile}
        title="My Profile"
        footer={
          confirmExit ? (
            <ConfirmBar
              onCancel={cancelExit}
              onConfirm={confirmExitWithoutSaving}
              message="You have unsaved changes. Exit without saving?"
              cancelLabel="Keep editing"
              confirmLabel="Exit without saving"
            />
          ) : (
            <>
              <button
                className={pressBtn(
                  'rounded-xl bg-[var(--theme-text-white)] text-[var(--theme-text)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]'
                )}
                type="button"
                onClick={requestCloseProfile}
              >
                Close
              </button>
              <button
                className={pressBtn(
                  'rounded-xl bg-[var(--theme-text-white)] text-[var(--theme-text)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed'
                )}
                type="submit"
                form="profile-form"
                disabled={loading || saving || !formDirty}
                aria-disabled={loading || saving || !formDirty}
              >
                {loading || saving ? 'Saving…' : 'Save Profile'}
              </button>
            </>
          )
        }
      >
        <p className="text-center opacity-80 text-sm sm:text-base mb-4">
          Update your contact and address details.
        </p>
        <ProfileInfo
          open={isProfileOpen}
          user={user as never}
          savedMsg={savedMsg}
          onSave={onSaveProfile}
          onDirtyChange={onDirtyChange}
        />
      </Modal>
    </div>
  );
}
