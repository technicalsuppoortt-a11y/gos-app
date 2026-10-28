import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { SupportChat } from './SupportChat';
import { SupportDialog } from './SupportDialog';
import { useUILanguage } from '../../i18n/display';
export function SupportQuickChat() {
  const [open, setOpen] = useState(false);
  const location = useLocation(), ar = useUILanguage().startsWith('ar');
  if (location.pathname === '/admin/support') return null;
  return <><button type="button" className="support-launcher" onClick={() => setOpen(true)} aria-label={ar ? 'فتح محادثة الدعم السريعة' : 'Open quick support chat'}><MessageCircle size={23}/></button>{open && <SupportDialog title={ar ? 'الدعم السريع' : 'Quick Support'} className="support-quick-dialog" onClose={() => setOpen(false)}><Link className="support-expand" to="/admin/support" onClick={() => setOpen(false)}>{ar ? 'فتح صفحة الدعم' : 'Open full support page'}</Link><SupportChat/></SupportDialog>}</>;
}
