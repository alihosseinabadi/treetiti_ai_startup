import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "typeface-yekan";
import "@fontsource/vazirmatn/arabic.css";
import "@fontsource/nunito/cyrillic.css";
import "@fontsource/nunito/latin-ext.css";
import "./styles/globals.css";
import "./i18n/i18n";
import App from "./App";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ChatProvider } from "./providers/ChatProvider";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { AuthProvider } from "./providers/AuthProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </BrowserRouter>
);
