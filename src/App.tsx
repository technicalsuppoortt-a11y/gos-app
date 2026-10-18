import { FirebaseSession } from './backend/session';
import { useUILanguage } from './i18n/display';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './context/ThemeProvider';
import { router } from './router';
import { Toaster } from 'sonner';
import './i18n/i18n';

function App() {
  const language = useUILanguage();
  return (
    <Provider store={store}>
      <ThemeProvider>
        <FirebaseSession><RouterProvider router={router} /></FirebaseSession>
        <Toaster 
          position={language === 'ar' ? 'bottom-left' : 'bottom-right'}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          richColors 
          closeButton
          theme="light"
          toastOptions={{
            duration: 3500,
            style: {
              padding: '16px 20px',
              fontSize: '14px',
              borderRadius: '12px',
            }
          }}
        />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
