import { FirebaseSession } from './backend/session';
import { useSessionReady } from './backend/sessionState';
import { CustomDomainInterceptor } from './components/common/CustomDomainInterceptor';
import { useUILanguage } from './i18n/display';
import { RouterProvider } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store, type RootState } from './store';
import { ThemeProvider } from './context/ThemeProvider';
import { router } from './router';
import { Toaster } from 'sonner';
import './i18n/i18n';
import { TrackingRuntime, setTrackingRouteSubscription } from './backend/marketingTracking';
setTrackingRouteSubscription(fn => router.subscribe(fn));

function ReadyTracking() {
  const ready = useSessionReady();
  return ready ? <TrackingRuntime/> : null;
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <CustomDomainInterceptor>
          <FirebaseSession><ReadyTracking/><RouterProvider router={router} /></FirebaseSession>
        </CustomDomainInterceptor>
        <AppToaster/>
      </ThemeProvider>
    </Provider>
  );
}

function AppToaster() {
  const language = useUILanguage();
  const theme = useSelector((state: RootState) => state.ui.theme);
  return (
    <Toaster
      position={language === 'ar' ? 'bottom-left' : 'bottom-right'}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      richColors
      closeButton
      theme={theme}
      toastOptions={{
        duration: 3500,
        style: { padding: '16px 20px', fontSize: '14px', borderRadius: '12px' },
      }}
    />
  );
}

export default App;
