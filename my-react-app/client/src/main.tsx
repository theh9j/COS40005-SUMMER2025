import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { I18nProvider } from "@/i18n";

createRoot(document.getElementById("root")!).render(
<I18nProvider>
  <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
    <App />
  </ThemeProvider>
</I18nProvider>
);