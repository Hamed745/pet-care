import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./store.jsx";
import App from "./App.jsx";
import "./index.css";
createRoot(document.getElementById("root")).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppProvider><App /></AppProvider></BrowserRouter>
);
