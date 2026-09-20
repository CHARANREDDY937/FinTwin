import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FinTwinProvider } from './store/FinTwinContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <FinTwinProvider>
        <App />
      </FinTwinProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
