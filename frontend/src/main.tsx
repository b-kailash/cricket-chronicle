import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Initialize IndexedDB connection
import { db } from './db/schema';

// Log database initialization
db.open().then(() => {
  console.log('[IndexedDB] Database initialized successfully');
}).catch((error) => {
  console.error('[IndexedDB] Failed to initialize database:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
