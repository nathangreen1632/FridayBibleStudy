// Client/src/types/photo.types.ts
export type Photo = {
  id: number;
  url: string;            // fully qualified or server-relative path to the image
  filename: string;
  userId: number;
  uploaderName: string;
  createdAt: string;
  note?: string | null;
};

export type PhotoListResponse = {
  items: Photo[];
  total: number;
  page: number;
  pageSize: number;
};
