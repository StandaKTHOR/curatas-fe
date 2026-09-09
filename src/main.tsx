import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '@gov-design-system-ce/fonts/lib/roboto.css'
import '@gov-design-system-ce/styles/tokens.css'
import '@gov-design-system-ce/styles/components.css'
import '@gov-design-system-ce/styles/styles.css'
import './index.css'
import './assets/css/bootstrap.css'
import './assets/css/main.css'
import { defineCustomElements } from '@gov-design-system-ce/components/loader'

defineCustomElements();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App/>
        </BrowserRouter>
    </React.StrictMode>)
