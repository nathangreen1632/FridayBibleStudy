export type PassageItem = {
  content?: string;
  reference?: string;
};

export type VerseOfDayViewProps = Readonly<{
  html: string;
  refText: string;
  loading: boolean;
}>;
