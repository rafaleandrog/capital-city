import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/theme.css";
import { useGameStore } from "./store/gameStore.js";
import * as engine from "./engine/engine.js";
import * as mapData from "./data/mapData.js";

// acesso pelo console para depuração:
//   window.store = window.useGameStore.getState()
//   window.engine.lotValue(window.store.lots["Q00-0-0"], window.store)
if (typeof window !== "undefined") {
  window.useGameStore = useGameStore;
  window.engine = engine;
  window.mapData = mapData;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
