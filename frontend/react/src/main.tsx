import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { applyGatewayUrl } from './api/http';
import './styles.css';

let startupFailed = false;

applyGatewayUrl()
  .catch((error: unknown) => {
    startupFailed = true;
    console.error(error);
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    );
    if (startupFailed) {
      console.error('Sign-in could not start. Try again.');
    }
  });
