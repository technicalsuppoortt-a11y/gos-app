import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import './support-launcher.css';

export function SupportQuickChat() {
  const location = useLocation(), navigate = useNavigate(), ar = useUILanguage().startsWith('ar');
  if (location.pathname === '/admin/support' || location.pathname === '/dashboard/support') return null;
  const isUserDashboard = location.pathname.startsWith('/dashboard');
  const fullSupportPath = isUserDashboard ? '/dashboard/support' : '/admin/support';

  return (
    <button
      type="button"
      className="support-launcher support-floating-trigger"
      onClick={() => navigate(fullSupportPath)}
      aria-label={ar ? 'فتح محادثة الدعم السريعة' : 'Open quick support chat'}
    >
      <MessageCircle size={22} strokeWidth={2.2} aria-hidden="true" focusable="false"/>
    </button>
  );
}
