import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './context/ThemeProvider';
import { router } from './router';
import { Toaster } from 'sonner';
import './i18n/i18n';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster 
          position="bottom-right" 
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
