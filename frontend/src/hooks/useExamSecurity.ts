// frontend/src/hooks/useExamSecurity.ts
import { useEffect, useCallback } from 'react';

type ViolationType = 'RIGHT_CLICK' | 'KEYBOARD_SHORTCUT' | 'TAB_SWITCH';

interface UseExamSecurityReturn {
  activateSecurity: () => void;
}

export const useExamSecurity = (
  onViolation?: (type: ViolationType, message: string) => void
): UseExamSecurityReturn => {

  const handleViolation = useCallback((type: ViolationType, message: string) => {
    // Silent logging only, no alerts
    console.log('Security action blocked:', type, message);
    onViolation?.(type, message);
  }, [onViolation]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('RIGHT_CLICK', 'Right-click blocked');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const forbidden = [
        e.key === 'F12',
        e.key === 'PrintScreen',
        (e.ctrlKey && e.shiftKey && e.key === 'I'),
        (e.ctrlKey && e.key === 'u'),
        (e.ctrlKey && e.key === 's'),
        (e.ctrlKey && e.key === 'a'),
        (e.ctrlKey && e.key === 'c'),
        (e.ctrlKey && e.key === 'v'),
        (e.altKey && e.key === 'Tab')
      ];

      if (forbidden.some(Boolean)) {
        e.preventDefault();
        handleViolation('KEYBOARD_SHORTCUT', `Blocked: ${e.key}`);
      }
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('TAB_SWITCH', 'Tab switching detected');
      }
    };

    // Add CSS to prevent text selection
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.head.removeChild(style);
    };
  }, [handleViolation]);

  const activateSecurity = useCallback(() => {
    console.log('Exam security activated - silent mode');
  }, []);

  return { activateSecurity };
};
