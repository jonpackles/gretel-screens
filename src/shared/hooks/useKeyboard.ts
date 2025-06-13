import { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from '../config/defaults';

interface UseKeyboardProps {
  onNext?: () => void;
  onPrev?: () => void;
  onToggleHide?: () => void;
  enabled?: boolean;
}

export function useKeyboard({ 
  onNext, 
  onPrev, 
  onToggleHide, 
  enabled = true 
}: UseKeyboardProps) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case KEYBOARD_SHORTCUTS.NEXT_MODE:
          onNext?.();
          break;
        case KEYBOARD_SHORTCUTS.PREV_MODE:
          onPrev?.();
          break;
        case KEYBOARD_SHORTCUTS.TOGGLE_HIDE:
          onToggleHide?.();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onToggleHide, enabled]);
} 