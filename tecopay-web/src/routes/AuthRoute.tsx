import { Route, Routes } from "react-router-dom";
import Login from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";

const AuthRoute = () => {

  return (
    <Routes>
      <Route path="/*" element={<Login />} />
    </Routes>
  );
};

export default AuthRoute;
