import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import { getRouterBasename } from './lib/router'
import '@gov-design-system-ce/fonts/lib/roboto.css'
import '@gov-design-system-ce/styles/tokens.css'
import '@gov-design-system-ce/styles/components.css'
import '@gov-design-system-ce/styles/styles.css'
import './index.css'
import './assets/css/bootstrap.css'
import './assets/css/main.css'
import './assets/css/demus.css'
import { defineCustomElements } from '@gov-design-system-ce/components/loader'

defineCustomElements();

const router = createBrowserRouter([{path: '*', element: <App/>}], {basename: getRouterBasename()});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RouterProvider router={router}/>
    </React.StrictMode>)
