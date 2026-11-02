import { render } from "solid-js/web";
import { Router, HashRouter } from "@solidjs/router";
import App from "./App.jsx";

import "./styles/variables.css";
import "./styles/reset.css";
import "./styles/base.css";
import "./styles/buttons.css";
import "./styles/forms.css";

const AppRouter = import.meta.env.VITE_GITHUB_PAGES === "true" ? HashRouter : Router;

render(
  () => (
    <AppRouter>
      <App />
    </AppRouter>
  ),
  document.getElementById("root")
);