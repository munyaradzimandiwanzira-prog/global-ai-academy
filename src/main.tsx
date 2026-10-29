import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { applyTheme } from '@/lib/theme';
import { ApiError } from '@/lib/api';
import App from './App';
import '@fontsource-variable/manrope';
import '@fontsource-variable/source-sans-3';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './styles/index.css';

// One public address: send www.skurulearning.com (and any www. host) to the bare domain, keeping the path.
if (location.hostname.startsWith('www.')) {
  location.replace(`${location.protocol}//${location.hostname.slice(4)}${location.pathname}${location.search}${location.hash}`);
}

applyTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
          <Toaster position="bottom-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
