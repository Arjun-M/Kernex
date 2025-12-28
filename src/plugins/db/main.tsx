import React from 'react'
import ReactDOM from 'react-dom/client'
import DbApp from './DbApp'
import '../../index.css'
import '../../styles/global.css'
import '../../styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DbApp />
  </React.StrictMode>,
)
