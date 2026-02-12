import React from 'react'
import ReactDOM from 'react-dom/client'
import UrlTracerApp from './UrlTracerApp'
import '../../styles/global.css'
import '../../styles/theme.css'
import { ToastProvider } from '../../app/ToastContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <UrlTracerApp />
      </div>
    </ToastProvider>
  </React.StrictMode>,
)
