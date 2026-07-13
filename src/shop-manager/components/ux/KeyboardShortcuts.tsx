import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    let lastGTime = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      // Start dashboard tour: Shift + /
      if ((e.shiftKey && e.key === '/') || e.key === '?') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('start-dashboard-tour'));
        toast({ title: 'Help', description: 'Starting dashboard tour…' });
        return;
      }

      // Two‑key sequences starting with "g"
      if (e.key.toLowerCase() === 'g') {
        lastGTime = Date.now();
        return;
      }

      const within = Date.now() - lastGTime < 600; // 600ms window
      if (within) {
        const k = e.key.toLowerCase();
        if (k === 'd') { e.preventDefault(); navigate('/module-hub'); }
        else if (k === 'w') { e.preventDefault(); navigate('/work-orders'); }
        else if (k === 'c') { e.preventDefault(); navigate('/customers'); }
        lastGTime = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);

    // Hint only on first visit
    if (!localStorage.getItem('ux_hint_shown')) {
      localStorage.setItem('ux_hint_shown', '1');
      toast({ title: 'Pro tip', description: "Press Shift+/ to start a quick tour. Use 'g d', 'g w', 'g c' to jump around." });
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate]);

  return null;
}

