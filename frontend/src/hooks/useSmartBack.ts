import { useNavigate } from 'react-router-dom';

export function useSmartBack(defaultFallback = '/') {
  const navigate = useNavigate();

  return (fallback?: string) => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallback || defaultFallback, { replace: true });
  };
}
