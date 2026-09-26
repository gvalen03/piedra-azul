import { Route } from "@solidjs/router";

import LoginPage from "./pages/auth/LoginPage.jsx";
import PacientePage from "./pages/pacientes/PacientePage.jsx";
import MedicoPage from "./pages/medicos/MedicoPage.jsx";
import CitasPage from "./pages/citas/CitasPage.jsx";
import DisponibilidadPage from "./pages/disponibilidad/DisponibilidadPage.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";

function App() {
  return (
    <Route>
      <Route path="/" component={LoginPage} />
      <Route path="/paciente" component={PacientePage} />
      <Route path="/medico" component={MedicoPage} />
      <Route path="/citas" component={CitasPage} />
      <Route
        path="/disponibilidad"
        component={DisponibilidadPage}
      />
      <Route path="/admin" component={AdminPage} />
    </Route>
  );
}

export default App;