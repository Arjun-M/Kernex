import React from 'react';
import ReactDOM from 'react-dom/client';
import HttpTester from './HttpTester';
import '../../styles/global.css'; // Inherit global styles
import '../../styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HttpTester />
  </React.StrictMode>
);
