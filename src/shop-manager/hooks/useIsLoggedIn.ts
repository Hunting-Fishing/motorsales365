
import { useAuthUser } from '@sm/hooks/useAuthUser';

export function useIsLoggedIn() {
  const { isAuthenticated, isLoading } = useAuthUser();
  
  return {
    isLoggedIn: isAuthenticated,
    isLoading
  };
}
