import { useEffect } from 'react';

const NavigationGuard = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handlePopState = () => {
      // Prevent going back by pushing current state again
      window.history.pushState(null, '', window.location.pathname);
    };

    // Add initial state
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return <>{children}</>;
};

export default NavigationGuard;