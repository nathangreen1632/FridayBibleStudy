export type UpdateRow = {
  id: number;
  prayerId: number;
  prayerTitle: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type SelectedMap = Record<number, boolean | undefined>;

export type AdminDigestViewProps = Readonly<{
  days: number;
  subject: string;
  isLoading: boolean;
  updates: UpdateRow[];
  selected: SelectedMap;
  onChangeDays: (days: number) => void;
  onChangeSubject: (subject: string) => void;
  onToggleRow: (id: number, checked: boolean) => void;
  onToggleAll: (next: boolean) => void;
  onSendAuto: () => Promise<void>;
  onSendManual: () => Promise<void>;
}>;
