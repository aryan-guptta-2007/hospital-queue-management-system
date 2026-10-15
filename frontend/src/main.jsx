import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './locales/i18n'
import './index.css'

const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('hq-landing-theme') : null
const initialDark = savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle('dark', initialDark)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
