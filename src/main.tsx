import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker immediately so the browser detects PWA compliance and fires beforeinstallprompt
registerSW({
  immediate: true,
  onNeedRefresh() {},
  onOfflineReady() {},
});

createRoot(document.getElementById('root')!).render(<App />);
