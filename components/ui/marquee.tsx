import React, { ComponentPropsWithoutRef, useRef } from 'react';

// Utility helper for class names if cn is not present
function cn(...classes: (string | undefined | null | false | Record<string, boolean>)[]) {
  const result: string[] = [];
  for (const c of classes) {
    if (!c) continue;
    if (typeof c === 'string') {
      result.push(c);
    } else if (typeof c === 'object') {
      for (const [key, val] of Object.entries(c)) {
        if (val) result.push(key);
      }
    }
  }
  return result.join(' ');
}

export interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
  autoFill?: boolean;
  ariaLabel?: string;
  ariaLive?: 'off' | 'polite' | 'assertive';
  ariaRole?: string;
  columnPauseOnHover?: boolean;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ariaLabel,
  ariaLive = 'off',
  ariaRole = 'marquee',
  columnPauseOnHover = false,
  ...props
}: MarqueeProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (columnPauseOnHover && marqueeRef.current) {
      marqueeRef.current.style.animationPlayState = 'paused';
    }
  };

  const handleMouseLeave = () => {
    if (columnPauseOnHover && marqueeRef.current) {
      marqueeRef.current.style.animationPlayState = 'running';
    }
  };

  return (
    <div
      {...props}
      ref={marqueeRef}
      data-slot="marquee"
      className={cn(
        'group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]',
        {
          'flex-row': !vertical,
          'flex-col': vertical,
        },
        className,
      )}
      aria-label={ariaLabel}
      aria-live={ariaLive}
      role={ariaRole}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {React.useMemo(
        () => (
          <>
            {Array.from({ length: repeat }, (_, i) => (
              <div
                key={i}
                className={cn(
                  !vertical ? 'flex-row [gap:var(--gap)]' : 'flex-col [gap:var(--gap)]',
                  'flex shrink-0 justify-around',
                  !vertical && 'animate-marquee flex-row',
                  vertical && 'animate-marquee-vertical flex-col',
                  pauseOnHover && !columnPauseOnHover && 'group-hover:[animation-play-state:paused]',
                  reverse && '[animation-direction:reverse]',
                )}
              >
                {children}
              </div>
            ))}
          </>
        ),
        [repeat, children, vertical, pauseOnHover, reverse, columnPauseOnHover],
      )}
    </div>
  );
}

export default Marquee;
