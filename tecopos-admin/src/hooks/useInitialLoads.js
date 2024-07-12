import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import APIServer from "../api/APIServices";
import { useAppSelector } from "../store/hooks";
import { fetchStore } from "../store/nomenclatorSlice";
import { selectUserSession } from "../store/userSessionSlice";

export const useInitialLoad = () => {
  const dispatch = useDispatch();
  const {business} = useAppSelector(state=>state.init);

  const [isLoading, setIsLoading] = useState(true);

  const init = async () => {
    setIsLoading(true);
    if (business.subscriptionPlan.code === "FREE") {
      await Promise.all([
        APIServer.get(`/administration/salescategory?per_page=150`),
      ])
        .then((resp) => {
          dispatch(
            fetchStore({
              salesCategories: resp[0].data.items,
            })
          );

          setIsLoading(false);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
            toast.error(message);
          } else {
            toast.error(
              "Ha ocurrido un error mientras se iniciaba la aplicación. Por favor, vuelva a intentarlo."
            );
          }
          setIsLoading(false);
        });
    } else {
      await Promise.all([
        APIServer.get(`/administration/salescategory?per_page=150`),
        APIServer.get(`/administration/productcategory?per_page=150`),
        APIServer.get(`/administration/area?per_page=150`),
        APIServer.get(`/administration/measures`),
      ])
        .then((resp) => {
          dispatch(
            fetchStore({
              salesCategories: resp[0].data.items,
              productCategories: resp[1].data.items,
              areas: resp[2].data.items,
              measures: resp[3].data.items,
            })
          );

          setIsLoading(false);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
            toast.info(message);
          } else {
            toast.error(
              "Ha ocurrido un error mientras se iniciaba la aplicación. Por favor, vuelva a intentarlo."
            );
          }
          setIsLoading(false);
        });
    }
  };

  useEffect(() => {
    init();
  }, []);

  return {
    isLoading,
    init,
  };
};
export default useInitialLoad;
