import { useStore } from '../../store/useStore';
import JoeAcademyLogo from './JoeAcademyLogo';
import './joe-academy-loader.css';

export default function JoeAcademyLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  const language = useStore(state => state.language);
  return <div className={`joe-academy-loading ${fullscreen ? 'joe-academy-loading-fullscreen' : ''}`}
    role="status" aria-label={language === 'ar' ? 'جاري التحميل' : 'Loading'}>
    <div className="joe-academy-loading-brand" aria-hidden="true">
      <JoeAcademyLogo className="joe-academy-loading-logo" />
      <strong>Joe Academy</strong>
      <span className="joe-academy-loading-spinner" />
    </div>
  </div>;
}
