
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TeamManagement() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the main Team page which has full functionality
    navigate('/team', { replace: true });
  }, [navigate]);
  
  return null;
}
