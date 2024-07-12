import { BrowserRouter } from "react-router-dom";
import AuthRouter from "./AuthRouter";
import AppRoute from "./AppRoute";
import { useAppSelector } from "../store/hooks";
import { Flip, ToastContainer } from "react-toastify";

export const MainRouter = () => {

  const {key} = useAppSelector((state) => state.session);


  return (
    <BrowserRouter >
      <ToastContainer
        position="top-center"
        hideProgressBar
        newestOnTop={true}
        rtl={false}
        draggable={true}
        theme="light"
        transition={Flip}
        pauseOnHover 
      

      />
      {key ? <AppRoute /> : <AuthRouter />}
    </BrowserRouter>
  );
};
