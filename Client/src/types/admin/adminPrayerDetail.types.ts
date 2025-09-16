export type AdminStatus = 'active' | 'praise' | 'archived';

export type AdminPrayerDetailViewProps = Readonly<{
  prayerId: number;
  isAdmin: boolean;

  // UI state
  content: string;
  localStatus: AdminStatus;
  showDeleteConfirm: boolean;

  // Data
  items: ReadonlyArray<{
    id: number | string;
    createdAt: string | number | Date;
    content: string;
  }>;

  // a11y ids
  statusSelectId: string;
  updateTextareaId: string;

  // Handlers
  onBack: () => void;
  onPost: () => void | Promise<void>;
  onSetStatus: () => void | Promise<void>;
  onClickDelete: () => void;
  onConfirmDelete: () => void | Promise<void>;
  onCancelDelete: () => void;
  onChangeStatus: (next: AdminStatus) => void;
  onChangeContent: (next: string) => void;
  onDeleteUpdate: (commentId: number) => void | Promise<void>;
}>;
