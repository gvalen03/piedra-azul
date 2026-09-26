import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import App from "./App.jsx";

import "./styles/variables.css";
import "./styles/reset.css";
import "./styles/base.css";
import "./styles/buttons.css";
import "./styles/forms.css";

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root")
);