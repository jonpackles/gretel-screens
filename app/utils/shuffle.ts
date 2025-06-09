import { MediaItem } from '../types/media';

/**
 * Shuffles an array of media items using the Fisher-Yates shuffle algorithm
 * @param media - Array of MediaItem objects to shuffle
 * @returns A new shuffled array (does not mutate the original)
 */
export function shuffleMedia(media: MediaItem[]): MediaItem[] {
  const shuffled = [...media]; // Create a copy to avoid mutating the original
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}


