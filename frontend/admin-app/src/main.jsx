// Standalone entry (used only for isolated dev/build). In production the shell
// imports `admin/App` and provides the router + providers.
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
