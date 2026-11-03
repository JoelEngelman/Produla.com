import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './liquid-glass.css'\nimport './CSS.css'\nimport LiquidGlassEffect from './LiquidGlassEffect.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
