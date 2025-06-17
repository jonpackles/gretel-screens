import { FileItem } from '../types';

export class ContentService {
  static async fetchProjects(): Promise<FileItem[]> {
    try {
      const res = await fetch('/api/media?path=linked-content/projects');
      const data = await res.json();
      const folders = data.items?.filter((item: FileItem) => {
        return item.type === 'directory' &&
          item.path.startsWith('linked-content/projects/') &&
          !item.path.substring('linked-content/projects/'.length).includes('/');
      }) || [];
      return folders;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  static async fetchProjectMedia(
    projectPath: string, 
    bustCache = false,
    page = 1,
    limit = 50
  ): Promise<{ items: FileItem[]; pagination: { total: number; hasMore: boolean } }> {
    try {
      const cacheBuster = bustCache ? `&_t=${Date.now()}` : '';
      const res = await fetch(
        `/api/media?path=${encodeURIComponent(projectPath)}&recursive=true&includeHidden=true&page=${page}&limit=${limit}${cacheBuster}`
      );
      const data = await res.json();
      const mediaFiles = data.items?.filter((item: FileItem) =>
        item.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(item.name)
      ) || [];
      
      return {
        items: mediaFiles,
        pagination: {
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasNext || false
        }
      };
    } catch (error) {
      console.error('Error fetching project media:', error);
      return { items: [], pagination: { total: 0, hasMore: false } };
    }
  }

  static async toggleFileVisibility(filePath: string): Promise<'visible' | 'hidden'> {
    try {
      const res = await fetch('/api/media/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', path: filePath })
      });
      const data = await res.json();
      if (data.success) {
        return data.visibility;
      }
      throw new Error('Failed to toggle visibility');
    } catch (error) {
      console.error('Error toggling file visibility:', error);
      throw error;
    }
  }

  static async batchUpdateVisibility(updates: Record<string, 'visible' | 'hidden'>): Promise<void> {
    try {
      const res = await fetch('/api/media/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', updates })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      throw error;
    }
  }

  static async getHiddenFiles(): Promise<string[]> {
    try {
      const res = await fetch('/api/media/visibility?action=list-hidden');
      const data = await res.json();
      return data.hiddenFiles || [];
    } catch (error) {
      console.error('Error fetching hidden files:', error);
      return [];
    }
  }

  static async fetchAllProjectMedia(projectPath: string): Promise<FileItem[]> {
    try {
      const res = await fetch(`/api/media?path=${encodeURIComponent(projectPath)}&recursive=true&includeHidden=true&limit=10000`);
      const data = await res.json();
      const mediaFiles = data.items?.filter((item: FileItem) =>
        item.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(item.name)
      ) || [];
      return mediaFiles;
    } catch (error) {
      console.error('Error fetching all project media:', error);
      return [];
    }
  }
} 