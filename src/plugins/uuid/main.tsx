import React from 'react'
import ReactDOM from 'react-dom/client'
import UtilsApp from '../utils/UtilsApp'
import '../../styles/theme.css'
import '../../styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UtilsApp tool="uuid" />
  </React.StrictMode>,
)
