import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route
} from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { OlvidePassword } from "./pages/OlvidePassword";
import { RestablecerPassword } from "./pages/RestablecerPassword";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import { Espacios } from "./pages/Espacios";
import { Agenda } from "./pages/Agenda";
import { NuevoServicio } from "./pages/NuevoServicio";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        path="/"
        element={<Landing />}
        errorElement={<h1>Not found!</h1>}
      />

      <Route
        path="/login"
        element={<Login />}
        errorElement={<h1>Not found!</h1>}
      />

      <Route
        path="/olvide-password"
        element={<OlvidePassword />}
        errorElement={<h1>Not found!</h1>}
      />

      <Route
        path="/restablecer-password"
        element={<RestablecerPassword />}
        errorElement={<h1>Not found!</h1>}
      />

      <Route
        path="/app"
        element={<ProtectedRoute />}
        errorElement={<h1>Not found!</h1>}
      >
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/app/agenda" replace />} />
          <Route path="single/:theId" element={<Single />} />
          <Route path="demo" element={<Demo />} />
          <Route path="espacios" element={<Espacios />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="nuevo-servicio" element={<NuevoServicio />} />
        </Route>
      </Route>
    </>
  )
);

