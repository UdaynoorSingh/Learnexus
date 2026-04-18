import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { showApiErrorToast, showToast } from './services/toast.js'

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (reason == null) return

    if (reason.isRateLimit) {
      event.preventDefault()
      return
    }

    const isAxios =
      (typeof axios.isAxiosError === 'function' && axios.isAxiosError(reason)) ||
      !!(reason.response && reason.config) ||
      reason.name === 'AxiosError'

    if (isAxios || reason?.response) {
      if (!reason.__learnexusGlobalToastShown && !reason.config?.skipErrorToast) {
        showApiErrorToast(reason)
      }
    } else {
      const msg = typeof reason?.message === 'string' ? reason.message : String(reason)
      if (msg && !msg.includes('ResizeObserver') && !msg.includes('cancelled')) {
        showToast('error', 'Something unexpected happened. Please try again.', 'Error')
      }
    }

    event.preventDefault()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
