import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * @summary Track the OS "reduce motion" setting so animations can degrade to instant.
 * @returns boolean — true when the user prefers reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { mounted = false; sub?.remove?.(); };
  }, []);
  return reduce;
}
