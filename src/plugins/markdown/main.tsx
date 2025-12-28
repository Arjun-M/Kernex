import React from 'react'
import ReactDOM from 'react-dom/client'
import DataApp from '../data/DataApp'
import '../../styles/theme.css'
import '../../styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataApp tool="markdown" />
  </React.StrictMode>,
)
