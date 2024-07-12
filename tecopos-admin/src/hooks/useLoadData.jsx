import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setFormValues } from "../store/formModalValuesSelectProductSlice";
import { modalActive, selectModalStates } from "../store/modalProductSlice";
import { getAllMeasure } from "../store/productSlice";
import { selectUserSession } from "../store/userSessionSlice";

const useLoadData = () => {
  const {business} = useAppSelector(state=>state.init);
  const statesModal = useAppSelector(selectModalStates);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(getAllMeasure());
    dispatch(modalActive());
    dispatch(
      setFormValues({
        name: "",
        areas: [],
        description: "",
        productCategoryId: "",
        salesCategoryId: "",
        codeCurrency: business?.costCurrency,
        price: "",
      })
    );
  }, [statesModal.show]);
};

export default useLoadData;
