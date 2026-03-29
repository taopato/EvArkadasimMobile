import { useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getScrollPosition, setScrollPosition } from '../shared/state/scrollPositions';

export default function useScrollRestore(key) {
  const listRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      const y = getScrollPosition(key);
      if (y && listRef.current?.scrollToOffset) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({ offset: y, animated: false });
        });
      }
    }, [key])
  );

  const handleScroll = useCallback((e) => {
    const y = e?.nativeEvent?.contentOffset?.y || 0;
    setScrollPosition(key, y);
  }, [key]);

  return { listRef, handleScroll };
}


