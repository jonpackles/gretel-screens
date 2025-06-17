import { ScreenId } from '@/types';
import { ModeSequenceItem } from '../types';

export interface ModeConfig {
  component: React.ComponentType<any>;
  name: string;
  duration: number;
  mediaPath: string | undefined;
  props?: any;
}

export class SequenceService {
  /**
   * Fetch sequence configuration for a specific screen
   */
  static async getSequence(screenId: ScreenId): Promise<ModeSequenceItem[]> {
    try {
      const res = await fetch(`/api/sequences?screen=${screenId}`);
      if (!res.ok) {
        throw new Error(`Failed to load sequence for ${screenId}`);
      }
      return await res.json();
    } catch (error) {
      console.error('Error fetching sequence:', error);
      throw error;
    }
  }

  /**
   * Update sequence configuration for a specific screen
   */
  static async updateSequence(screenId: ScreenId, sequence: ModeSequenceItem[]): Promise<void> {
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screen: screenId,
          sequence: sequence
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save sequence');
      }
    } catch (error) {
      console.error('Error updating sequence:', error);
      throw error;
    }
  }

  /**
   * Validate a sequence configuration
   */
  static validateSequence(sequence: ModeSequenceItem[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(sequence)) {
      errors.push('Sequence must be an array');
      return { isValid: false, errors };
    }

    if (sequence.length === 0) {
      errors.push('Sequence cannot be empty');
    }

    sequence.forEach((item, index) => {
      if (!item.mode) {
        errors.push(`Item ${index + 1}: mode is required`);
      }
      if (item.duration && (typeof item.duration !== 'number' || item.duration <= 0)) {
        errors.push(`Item ${index + 1}: duration must be a positive number`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }
} 