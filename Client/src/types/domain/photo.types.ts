// Client/src/types/photo.types.ts
import React from 'react';

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

export type PhotoItem = {
  id: number;
  url: string;
  filename?: string;
  note?: string | null;
  uploaderName: string;
  createdAt: string;
};

export type FooterNoteFn = () => React.ReactElement;
export type TotalPagesFn = () => number;