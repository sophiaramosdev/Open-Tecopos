import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectFormValues } from "../store/formModalValuesSelectProductSlice";
const validateForm = {
  email: /^(\w+[/./-/_]?){1,}@[a-z]+[/.]\w{2,}$/,
  phones: /^\+?(53)?((5[0-9]{7}$)|([0-9]{7,8}))$/,
};
export const useControlInputs = ({
  phonesValues,
  initialValue,
  setPhonesValues,
  setInitialValue,
  global,
  reducer,
  toFind,
}) => {
  const formValues = useAppSelector(selectFormValues);
  const dispatch = useAppDispatch();
  const [isValid, setIsValid] = useState(true);
  const [typeOnShow, setTypeOnShow] = useState("");

  const handleChange = (e, index) => {
    const { name, value, id, type } = e.target;

    setIsValid(true);
    if (type === "checkbox") {
    }
    if (id === "phones") {
      const toValidatePhones = validateForm[id].test(value);
      const newData = [...phonesValues];
      newData[index] = { ...phonesValues[index], [name]: value };
      setPhonesValues(newData);
      value === "" ? setIsValid(true) : setIsValid(toValidatePhones);
      setTypeOnShow(id);
    }

    if (id === "email") {
      const toValidateEmail = validateForm[id].test(value);
      setInitialValue({ ...initialValue, [name]: value });
      value === "" ? setIsValid(true) : setIsValid(toValidateEmail);
      setTypeOnShow(id);
    } else {
      if (global) {
        dispatch(reducer({ ...formValues, [name]: value }));
        setInitialValue && setInitialValue({ ...initialValue, [name]: value });
      } else setInitialValue({ ...initialValue, [name]: value });
    }
  };

  const handleChangeSelect = (props) => {
    const { name, value } = props;
    setIsValid(true);
    if (global) {
      dispatch(reducer({ ...formValues, [name]: value }));
      setInitialValue && setInitialValue({ ...initialValue, [name]: value });
    } else setInitialValue({ ...initialValue, [name]: value });
  };

  return { handleChange, handleChangeSelect, isValid, typeOnShow };
};

export default useControlInputs;
