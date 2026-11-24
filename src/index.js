import React from 'react';
import ReactDOM from 'react-dom/client';
// Písmo Geist priamo z appky (nie z Google Fonts), aby sa Googlu neposielala IP adresa používateľa.
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
