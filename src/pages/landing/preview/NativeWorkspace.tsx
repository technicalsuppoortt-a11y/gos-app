import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserLayout } from '../../../components/layout/UserLayout';
import { previewScreens } from './screens';

export function NativeWorkspace() {
  const location = useLocation();
  const screen = previewScreens.find(item => item.path === location.pathname) ?? previewScreens[0];
  useEffect(() => { parent.postMessage({ type: 'gos-demo-screen-ready', screen: screen.id }, window.location.origin); }, [screen.id]);
  return <div className="lp-demo-root" data-demo-screen={screen.id} inert><UserLayout/></div>;
}
