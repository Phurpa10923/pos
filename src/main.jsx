import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The app is now fully online-only (all data lives directly in Supabase, no local
// cache) so the offline app-shell service worker this used to register is no
// longer needed — and its caching was silently serving stale data after saves.
// Unregister any previously-installed worker and clear its caches so devices
// that already have it installed stop being affected.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}
if ('caches' in window) {
  caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
}

