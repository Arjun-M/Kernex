import { useEffect } from 'react';
import { KERNEX_CONFIG } from '../../kernex.config';

export const useTitle = (title?: string) => {
  useEffect(() => {
    const base = KERNEX_CONFIG.name;
    document.title = title ? `${base} | ${title}` : base;
  }, [title]);
};
