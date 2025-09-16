// Client/src/jsx/eventsPageView.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import EventModal from '../../modals/EventModalLogic.tsx';
import type { EventRow } from '../../helpers/api/eventsApi.ts';

type CreateForm = {
  title: string;
  content: string;
  startsAt: string;
  endsAt: string;
  location: string;
};

type EditForm = {
  title: string;
  content: string;
  startsAt: string;
  endsAt: string;
  location: string;
};

type Props = {
  isAdmin: boolean;

  // list + status
  items: EventRow[];
  loading: boolean;

  // create form
  create: CreateForm;
  setCreate: (next: CreateForm) => void;
  isCreateOpen: boolean;
  toggleCreateOpen: () => void;
  onCreate: (e: React.FormEvent) => Promise<void> | void;

  // edit
  editingId: number | null;
  edit: EditForm;
  setEdit: (next: EditForm) => void;
  hasChanges: boolean;
  beginEdit: (id: number) => void;
  cancelEdit: () => void;
  saveEdit: (id: number) => Promise<void> | void;

  // actions
  onEmailEvent: (id: number) => Promise<void> | void;
  removeRow: (id: number) => Promise<void> | void;

  // modal
  modalOpen: boolean;
  modalEvent: EventRow | null;
  closeModal: () => void;
  openModal: (ev: EventRow) => void;
};

export default function EventsPageView({
                                         isAdmin,
                                         items,
                                         loading,

                                         create,
                                         setCreate,
                                         isCreateOpen,
                                         toggleCreateOpen,
                                         onCreate,

                                         editingId,
                                         edit,
                                         setEdit,
                                         hasChanges,
                                         beginEdit,
                                         cancelEdit,
                                         saveEdit,

                                         onEmailEvent,
                                         removeRow,

                                         modalOpen,
                                         modalEvent,
                                         closeModal,
                                         openModal,
                                       }: Readonly<Props>): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4">
      <h1 className="mb-3 text-2xl font-extrabold">Events</h1>

      {isAdmin && (
        <div className="mb-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
          {/* Toggle header */}
          <button
            type="button"
            aria-expanded={isCreateOpen}
            onClick={toggleCreateOpen}
            className="flex w-full items-center justify-between gap-3 rounded-t-xl px-3 py-2"
          >
            <span className="font-semibold">Create Event</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isCreateOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Collapsible body */}
          {isCreateOpen && (
            <form
              onSubmit={onCreate}
              className="flex flex-col rounded-b-xl gap-2 border-t border-[var(--theme-border)] p-3 bg-[var(--theme-surface)]"
            >
              <input
                value={create.title}
                onChange={(e) => setCreate({ ...create, title: e.target.value })}
                placeholder="Title"
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
              />

              <textarea
                value={create.content}
                onChange={(e) => setCreate({ ...create, content: e.target.value })}
                placeholder="Details"
                className="min-h-[120px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={create.startsAt}
                  onChange={(e) => setCreate({ ...create, startsAt: e.target.value })}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                />
                <input
                  type="datetime-local"
                  value={create.endsAt}
                  onChange={(e) => setCreate({ ...create, endsAt: e.target.value })}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                />
              </div>

              <input
                value={create.location}
                onChange={(e) => setCreate({ ...create, location: e.target.value })}
                placeholder="Location"
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
              />

              <div className="flex justify-end">
                <button className="rounded-xl px-4 py-2 bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]">
                  Save
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* === GRID of independent event cards === */}
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        {loading && <div className="p-3">Loading…</div>}

        {!loading && items.length === 0 && <div className="p-3">No events yet.</div>}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 bg-[var(--theme-surface)]">
            {items.map((ev) => {
              const isEditing = editingId === ev.id;

              if (isEditing) {
                return (
                  <section
                    key={ev.id}
                    className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm"
                  >
                    <div className="mb-2 text-xs opacity-60">
                      Editing “{edit.title || (ev.title ?? 'Untitled')}”
                    </div>

                    <input
                      value={edit.title}
                      onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                      placeholder="Title"
                      className="mb-2 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                    />

                    <textarea
                      value={edit.content}
                      onChange={(e) => setEdit({ ...edit, content: e.target.value })}
                      placeholder="Details"
                      className="mb-2 min-h-[100px] w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                    />

                    <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="datetime-local"
                        value={edit.startsAt}
                        onChange={(e) => setEdit({ ...edit, startsAt: e.target.value })}
                        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                      />
                      <input
                        type="datetime-local"
                        value={edit.endsAt}
                        onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })}
                        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                      />
                    </div>

                    <input
                      value={edit.location}
                      onChange={(e) => setEdit({ ...edit, location: e.target.value })}
                      placeholder="Location"
                      className="mb-3 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 placeholder:text-[var(--theme-placeholder)]/80"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(ev.id)}
                        disabled={!hasChanges}
                        className="rounded-xl px-4 py-2 bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-xl bg-[var(--theme-pill-orange)] px-4 py-2 hover:bg-[var(--theme-button-hover)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </section>
                );
              }

              // view card
              const startD = ev.startsAt ? new Date(ev.startsAt) : null;
              const endD = ev.endsAt ? new Date(ev.endsAt) : null;

              return (
                <article
                  key={ev.id}
                  className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-accent)] p-4 shadow-sm"
                >
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`View details for event: ${ev.title || 'Untitled Event'}`}
                    onClick={() => openModal(ev)}
                    className="group block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-xl text-[var(--theme-text-white)] group-hover:underline underline-offset-4">
                          {ev.title || 'Untitled Event'}
                        </div>

                        {startD && (
                          <div className="text-sm opacity-80 text-[var(--theme-text-white)]">
                            <span className="font-semibold">Date:</span>{' '}
                            {startD.toLocaleDateString()}
                            {endD && ` – ${endD.toLocaleDateString()}`}
                          </div>
                        )}

                        {startD && (
                          <div className="text-sm opacity-80 text-[var(--theme-text-white)]">
                            <span className="font-semibold">Time:</span>{' '}
                            {startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {endD &&
                              ` – ${endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        )}

                        {ev.location && (
                          <div className="text-sm opacity-80 text-[var(--theme-text-white)]">
                            <span className="font-semibold">Location:</span> {ev.location}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-[var(--theme-text-white)] opacity-70">
                      Click to view details
                    </div>
                  </button>

                  {isAdmin && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(ev.id)}
                        className="rounded-lg border border-[var(--theme-border)] px-3 py-1 text-sm bg-[var(--theme-button-dark)] text-[var(--theme-accent)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onEmailEvent(ev.id)}
                        className="rounded-lg border border-[var(--theme-border)] px-3 py-1 text-sm bg-[var(--theme-button-dark)] text-[var(--theme-accent)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
                        aria-label="Email this event to the group"
                        title="Email this event to the group"
                      >
                        Email Group
                      </button>

                      <button
                        type="button"
                        onClick={() => removeRow(ev.id)}
                        className="rounded-lg bg-[var(--theme-error)] hover:bg-[var(--theme-button-error)] px-3 py-1 text-sm text-white hover:opacity-90"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <EventModal open={modalOpen} event={modalEvent} onClose={closeModal} />
    </div>
  );
}
