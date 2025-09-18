import type { User } from '../domain/domain.types.ts';

export type FormValues = {
  name: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  spouseName: string;
};

export type ProfileFormProps = {
  open?: boolean;
  user: User;
  savedMsg?: string | null;
  onSave: (values: FormValues) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};
