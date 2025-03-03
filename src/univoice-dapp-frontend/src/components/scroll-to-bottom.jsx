import { useEffect, useCallback, useRef } from 'react';

export const UseScrollToBottom = (options = {}) => {
    const {
      callback,
      offset = 100,
      debounce = 200,
      useWindow = false
    } = options;
  
    const containerRef = useRef(null);
    const timeoutRef = useRef(null);
  
    const checkBottom = useCallback(() => {
      let element, scrollTop, clientHeight, scrollHeight;
  
      if (useWindow) {
        element = document.documentElement;
        scrollTop = window.scrollY || element.scrollTop;
        clientHeight = window.innerHeight;
        scrollHeight = element.scrollHeight;
      } else {
        element = containerRef.current;
        if (!element) return;
        scrollTop = element.scrollTop;
        clientHeight = element.clientHeight;
        scrollHeight = element.scrollHeight;
      }
  
      const isBottom = scrollTop + clientHeight >= scrollHeight - offset;
      if (isBottom) callback();
    }, [callback, offset, useWindow]);
  
    const handleScroll = useCallback(() => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(checkBottom, debounce);
    }, [checkBottom, debounce]);

    let target;
    let timer;
  
    useEffect(() => {
      timer = setTimeout(() => {
        target = useWindow ? window : containerRef.current;
        if (!target) return;
        target.addEventListener('scroll', handleScroll);
        clearTimeout(timer)
      }, 100);
      return () => {
        target.removeEventListener('scroll', handleScroll);
        clearTimeout(timeoutRef.current);
      };
    }, [handleScroll, useWindow]);
  
    return containerRef;
  }

export default UseScrollToBottom;