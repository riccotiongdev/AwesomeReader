import React from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from './app/page';
import SpikeHarness from './components/SpikeHarness';
import './app/globals.css';

// Dev-only spike harness for ticket 01 (foliate-js): reach it at #spike
if (window.location.hash === '#spike') {
  ReactDOM.createRoot(document.getElementById('root')!).render(<SpikeHarness />);
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HomePage />
    </React.StrictMode>
  );
}
