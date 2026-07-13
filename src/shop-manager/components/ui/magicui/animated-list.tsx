import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

/**
 * MagicUI AnimatedList — staggered in/out reveal as items mount.
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({ className, children, delay = 1000 }) => {
  const [index, setIndex] = useState(0);
  const childArr = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (index < childArr.length - 1) {
      const t = setTimeout(() => setIndex((i) => i + 1), delay);
      return () => clearTimeout(t);
    }
  }, [index, delay, childArr.length]);

  const visible = childArr.slice(0, index + 1).reverse();

  return (
    <div className={cn('flex flex-col items-stretch gap-3', className)}>
      <AnimatePresence>
        {visible.map((item) => (
          <AnimatedListItem key={(item as any)?.key ?? Math.random()}>{item}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const AnimatedListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: 'spring' as const, stiffness: 350, damping: 40 },
  };
  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
};
