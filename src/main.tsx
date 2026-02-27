import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { ThemeProvider } from "./context/theme-context"
import { ServerDataProvider } from "./context/server-data-context"
import { CommandProvider } from "./context/command-context"
import { LocaleProvider } from "./context/locale-context"
import "@fontsource-variable/inter"
import "./styles/globals.css"
import "flag-icons/css/flag-icons.min.css"
import "font-logos/assets/font-logos.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <ThemeProvider>
          <ServerDataProvider>
            <CommandProvider>
              <App />
            </CommandProvider>
          </ServerDataProvider>
        </ThemeProvider>
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
