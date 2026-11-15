import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n";
import "./index.css";
import App from "./App";

// Optional remote fonts must never hold up the first map render.
const webFonts = document.getElementById("web-fonts") as HTMLLinkElement | null;
if (webFonts) {
  if (webFonts.sheet) webFonts.media = "all";
  else webFonts.addEventListener("load", () => { webFonts.media = "all"; }, { once: true });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
