import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import type { RootState } from '../../store';
import './workspace-loading.css';

type Variant = 'inbox' | 'dashboard' | 'spinner';
const Line = ({ short = false }: { short?: boolean }) => <span className={`ws-skeleton ws-line${short ? ' ws-line-short' : ''}`}/>;
const Avatar = () => <span className="ws-skeleton ws-avatar"/>;

/** Static placeholders are hidden from assistive technology; one status announces the load. */
export function WorkspaceSkeleton({ variant = 'dashboard', fullScreen = false }: { variant?: Variant; fullScreen?: boolean }) {
  const { theme, language } = useSelector((state: RootState) => state.ui);
  const ar = language === 'ar';
  const label = variant === 'inbox' ? (ar ? 'جارٍ تحميل صندوق الوارد' : 'Loading inbox') : (ar ? 'جارٍ تحميل المحتوى' : 'Loading content');
  return <div className={`workspace-loading workspace-loading--${variant}${theme === 'dark' ? ' is-dark' : ''}${fullScreen ? ' workspace-loading--fullscreen' : ''}`}
    role="status" aria-live="polite" aria-busy="true" aria-label={label} dir={ar ? 'rtl' : 'ltr'}>
    <span className="ws-sr-only">{label}</span>
    {variant === 'spinner' ? <div className="ws-brand-loader" aria-hidden="true"><span className="ws-brand-mark">G</span><span className="ws-brand-ring"/></div> :
      <div className="ws-skeleton-content" aria-hidden="true">
        <div className="ws-toolbar ws-panel"><div className="ws-toolbar-tabs">{[0, 1, 2, 3].map(i => <span className={`ws-skeleton ws-tab${i === 0 ? ' ws-accent' : ''}`} key={i}/>)}</div><span className="ws-skeleton ws-toolbar-action"/></div>
        {variant === 'inbox' ? <div className="ws-inbox-grid">
          <div className="ws-panel ws-conversation-list">
            <div className="ws-list-heading"><Line short/><span className="ws-skeleton ws-search"/></div>
            {Array.from({ length: 6 }, (_, i) => <div className={`ws-conversation${i === 0 ? ' is-selected' : ''}`} key={i}><Avatar/><div className="ws-contact-lines"><Line short/><Line/><Line/></div><span className="ws-skeleton ws-unread"/></div>)}
          </div>
          <div className="ws-panel ws-chat">
            <div className="ws-chat-heading"><Avatar/><div className="ws-contact-lines"><Line short/><Line/></div><span className="ws-skeleton ws-dot"/><span className="ws-skeleton ws-dot"/></div>
            <div className="ws-messages"><span className="ws-skeleton ws-date"/>{[0, 1, 2, 3].map(i => <div className={`ws-bubble${i % 2 ? ' ws-bubble-outgoing' : ''}`} key={i}><Line/><Line/><Line short/></div>)}</div>
            <div className="ws-composer"><div className="ws-skeleton ws-input"/><span className="ws-skeleton ws-send ws-accent"/></div>
          </div>
          <div className="ws-panel ws-contact-card"><Avatar/><Line short/><Line/><div className="ws-contact-divider"/>{[0, 1, 2, 3].map(i => <div className="ws-detail-row" key={i}><Line short/><Line/></div>)}</div>
        </div> : <div className="ws-dashboard">
          <div className="ws-page-heading"><Line short/><Line/></div>
          <div className="ws-stats">{[0, 1, 2, 3].map(i => <div className="ws-panel ws-stat" key={i}><span className="ws-skeleton ws-stat-icon ws-accent"/><Line/><span className="ws-skeleton ws-stat-value"/><Line short/></div>)}</div>
          <div className="ws-dashboard-grid"><div className="ws-panel ws-chart"><Line short/><div className="ws-chart-bars">{[42, 65, 52, 80, 62, 92, 74, 88].map((height, i) => <span className="ws-skeleton" style={{ height: `${height}%` }} key={i}/>)}</div></div>
            <div className="ws-panel ws-activity"><Line short/>{[0, 1, 2, 3].map(i => <div className="ws-conversation" key={i}><Avatar/><div className="ws-contact-lines"><Line/><Line short/></div></div>)}</div></div>
        </div>}
      </div>}
  </div>;
}

export function WorkspaceLoading() {
  const { pathname } = useLocation();
  return <WorkspaceSkeleton variant={/(?:^|\/)inbox(?:\/|$)/.test(pathname) ? 'inbox' : 'dashboard'}/>;
}
