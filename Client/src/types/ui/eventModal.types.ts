import type { EventRow } from '../../helpers/api/eventsApi.ts';

export type EventModalProps = Readonly<{
  open: boolean;
  event: EventRow | null;
  onClose: () => void;
}>;

export type EventModalViewProps = Readonly<{
  open: boolean;
  event: EventRow | null;
  onClose: () => void;
}>;
