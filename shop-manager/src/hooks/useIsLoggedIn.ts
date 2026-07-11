
import { useAuthUser } from '@/hooks/useAuthUser';

export function useIsLoggedIn() {
  const { isAuthenticated, isLoading } = useAuthUser();
  
  return {
    isLoggedIn: isAuthenticated,
    isLoading
  };
}
