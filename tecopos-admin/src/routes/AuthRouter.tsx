import { Route, Routes } from "react-router-dom";
import { LogInPage } from "../pages";
import MyMenu from "../pages/public/MyMenu";

const AuthRouter = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<LogInPage />} />
        <Route path="/menu/:slug" element={<MyMenu />} />
        <Route path="*" element={<LogInPage />} />
      </Routes>
    </>
  );
};

export default AuthRouter;
