import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./liquid-glass.css";
import "./CSS.css";
import LiquidGlassEffect from "./LiquidGlassEffect.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LiquidGlassEffect />
    <App />
  </StrictMode>
);
