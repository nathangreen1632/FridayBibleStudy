// Client/src/types/resetPassword.types.ts

export type ResetFormState = {
  email: string;
  otp: string;            // stored as digits only (max 6)
  newPassword: string;
  confirmPassword: string;
};
