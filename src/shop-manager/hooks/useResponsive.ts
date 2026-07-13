import { useState, useEffect } from 'react';

interface BreakpointConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  screenWidth: number;
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function useResponsive(customBreakpoints?: Partial<BreakpointConfig>) {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };

  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        screenWidth: 1024,
        breakpoint: 'lg' as const,
      };
    }

    const width = window.innerWidth;
    return getResponsiveState(width, breakpoints);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      setState(getResponsiveState(width, breakpoints));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

function getResponsiveState(width: number, breakpoints: BreakpointConfig): ResponsiveState {
  let breakpoint: ResponsiveState['breakpoint'] = 'sm';
  
  if (width >= breakpoints['2xl']) breakpoint = '2xl';
  else if (width >= breakpoints.xl) breakpoint = 'xl';
  else if (width >= breakpoints.lg) breakpoint = 'lg';
  else if (width >= breakpoints.md) breakpoint = 'md';
  else breakpoint = 'sm';

  return {
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    isLargeDesktop: width >= breakpoints.xl,
    screenWidth: width,
    breakpoint,
  };
}

export function useBreakpoint() {
  const { breakpoint } = useResponsive();
  return breakpoint;
}

export function useIsMobileEnhanced() {
  const { isMobile } = useResponsive();
  return isMobile;
}