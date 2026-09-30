import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './context/ThemeProvider';
import { router } from './router';
import './i18n/i18n';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
