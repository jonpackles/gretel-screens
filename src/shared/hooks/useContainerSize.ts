import { useEffect, useState, RefObject } from 'react';
import { Size } from '../types/common';

interface UseContainerSizeOptions {
  initialSize?: Size;
}

export function useContainerSize(
  ref: RefObject<HTMLElement>,
  options: UseContainerSizeOptions = {}
) {
  const [size, setSize] = useState<Size>(
    options.initialSize || { width: 800, height: 600 }
  );

  useEffect(() => {
    function updateSize() {
      if (ref.current) {
        setSize({
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        });
      }
    }

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [ref]);

  return size;
} 