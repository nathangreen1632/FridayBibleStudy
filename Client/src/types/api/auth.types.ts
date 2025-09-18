export type FromState =
  | { from?: string | { pathname?: string | null } | null }
  | null
  | undefined;

export type LoginFormState = {
  email: string;
  password: string;
  showPw: boolean;
  err: string | null;
};
