// frontend/src/hooks/useExamSecurity.ts
import { useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

type ViolationType = 'RIGHT_CLICK' | 'KEYBOARD_SHORTCUT' | 'TAB_SWITCH' | 'WINDOW_RESIZE';

interface UseExamSecurityReturn {
  activateSecurity: () => void;
  deactivateSecurity: () => void;
}

export const useExamSecurity = (
  onViolation?: (type: ViolationType, message: string) => void,
  sessionId?: string,
  candidateEmail?: string
): UseExamSecurityReturn => {
  const tabSwitchViolations = useRef(0);
  const tabMonitoringActive = useRef(false);
  const isTabHidden = useRef(false);
  const interviewCompleted = useRef(false);

  const handleViolation = useCallback((type: ViolationType, message: string) => {
    if (interviewCompleted.current) {
      console.log('Violation ignored - interview completed:', type, message);
      return;
    }

    console.log('Security action blocked:', type, message);
    onViolation?.(type, message);
  }, [onViolation]);

  const handleVisibilityChangeRef = useRef<(() => void) | null>(null);
  const deactivateSecurity = useCallback(() => {
    tabMonitoringActive.current = false;
    interviewCompleted.current = true;
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('RIGHT_CLICK', 'Right-click blocked');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const forbidden = [
        e.key === 'f12',
        e.key === 'PrintScreen',
        (e.ctrlKey && e.shiftKey && e.key === 'I'),
        (e.ctrlKey && e.key === 'u'),
        (e.ctrlKey && e.key === 's'),
        (e.ctrlKey && e.key === 'a'),
        (e.ctrlKey && e.key === 'c'),
        (e.ctrlKey && e.key === 'v'),
        (e.ctrlKey && e.key === 'r'),
        (e.altKey && e.key === 'Tab')
      ];

      if (forbidden.some(Boolean)) {
        e.preventDefault();
        handleViolation('KEYBOARD_SHORTCUT', `Blocked: ${e.key}`);
      }
    };

    // The terminateInterview function has been removed.
    // const terminateInterview = async (reason: string, count: number) => { ... };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const preventResize = () => {
      window.resizeTo(screen.availWidth, screen.availHeight);
      window.moveTo(0, 0);
    };

    const handleResize = () => {
      preventResize();
      handleViolation('WINDOW_RESIZE', 'Window resize blocked');
    };

    const handleVisibilityChange = async () => {
      if (!tabMonitoringActive.current || interviewCompleted.current) return;

      if (document.hidden && !isTabHidden.current) {
        isTabHidden.current = true;
        const newCount = tabSwitchViolations.current + 1;
        tabSwitchViolations.current = newCount;

        console.log(`Tab switch #${newCount} detected`);

        handleViolation('TAB_SWITCH', `Tab switching detected (${newCount})`);

        if (newCount === 1) {
          toast.error("⚠️ WARNING: Tab switching detected! Please stay on this tab.");
        } else if (newCount === 2) {
          toast.error("⚠️ SECOND WARNING: Tab switching detected again!");
        } else if (newCount === 3) {
          toast.error("🚨 FINAL WARNING: Please avoid tab switching during the interview!");
        } else if (newCount > 3) {
          // MODIFIED: Just show a toast for subsequent violations, do not terminate
          toast.error(`⚠️ Tab switching violation #${newCount}. Please stay on this tab.`);
        }
      } else if (!document.hidden && isTabHidden.current) {
        isTabHidden.current = false;
        console.log('Tab focused - violation count:', tabSwitchViolations.current);
      }
    };

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

    const tabMonitoringTimer = setTimeout(() => {
      tabSwitchViolations.current = 0;
      tabMonitoringActive.current = true;
      isTabHidden.current = false;
      preventResize();
      console.log('Tab switching monitoring activated');
    }, 10000);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(tabMonitoringTimer);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      document.head.removeChild(style);
    };
  }, [handleViolation, sessionId, candidateEmail]);

  const activateSecurity = useCallback(() => {
    console.log('Exam security activated - silent mode');
  }, []);

  return { activateSecurity, deactivateSecurity };
};