export type MediaItem = {
  name: string;
  type: 'file';
  path: string;
  project?: string;
  visibility?: 'visible' | 'hidden';
}; 