import useInitialLoad from "../api/useInitialLoad";
import Loading from "../components/misc/Loading";
import { useAppSelector } from "../store/hooks";
import FreeRoute from "./FreeRoute";
import PayedRoute from "./PayedRoute";
import { useEffect } from "react";

const AppRoute = () => {
  const { initLoad, isLoading } = useInitialLoad();
  const { business } = useAppSelector((state) => state.init);
  const plan = business?.subscriptionPlan?.code;  

  useEffect(() => {
    initLoad();
  }, []);

  if (isLoading) {
    return <Loading />;
  } else if (plan === "FREE") {
    return <FreeRoute />;
  } else {
    return <PayedRoute />;
  }
};

export default AppRoute;
