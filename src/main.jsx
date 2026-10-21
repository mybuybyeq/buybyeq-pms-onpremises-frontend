import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { initializeAxios } from "./api/axios.js";
import { loadConfig } from "./config/runtimeConfig.js";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SidebarProvider } from "./context/SidebarContext.jsx";

export const PMSRouter = () => (
  <BrowserRouter>
    <ThemeProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export const PMSAppWithProviders = () => (
  <ThemeProvider>
    <SidebarProvider>
      <App />
    </SidebarProvider>
  </ThemeProvider>
);

async function bootstrap() {
  await loadConfig();
  initializeAxios();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <PMSRouter />
    </React.StrictMode>
  );
}

if (typeof document !== "undefined" && document.getElementById("root")) {
  bootstrap();
}

export default PMSRouter;
