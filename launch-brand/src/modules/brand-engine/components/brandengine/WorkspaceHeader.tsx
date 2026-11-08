import { createPortal } from 'react-dom';
import { useAppSelector } from '../../store/hooks';
import { AppHeader } from './AppHeader';

export function WorkspaceHeader({ target, onOpenNavigation }: {
  target?: HTMLElement | null;
  onOpenNavigation?: () => void;
}) {
  const { language, theme } = useAppSelector(state => state.brand);
  const header = <AppHeader onOpenNavigation={onOpenNavigation} />;
  return target ? createPortal(
    <div className={`brand-engine-module launch-brand-toolbar ${theme}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {header}
    </div>,
    target,
  ) : header;
}
