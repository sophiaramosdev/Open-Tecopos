import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectFormValues } from "../../store/formModalValuesSelectProductSlice";

const MyChecked = ({
  value,
  reducerAdd,
  reducerRemove,
  label,
  name,
  booleanToCheckInArr,
  booleanToCheck,
  ...props
}) => {
  const formValues = useSelector(selectFormValues);
  const dispatch = useDispatch();
  const [checkedState, setCheckedState] = useState(false);
  useEffect(() => {
    setCheckedState(
      booleanToCheckInArr !== undefined
        ? formValues.areas.includes(value.toString())
        : booleanToCheck !== undefined
        ? booleanToCheck
        : false
    );
  }, [checkedState]);
  const handleOnCheck = (e) => {
    const { checked, value } = e.target;
    setCheckedState(!checkedState);
    checked ? dispatch(reducerAdd(value)) : dispatch(reducerRemove(value));
  };
  return (
    <div className="flex p-1 cursor-pointer items-center gap-2">
      <input
        checked={checkedState}
        type="checkbox"
        onChange={(e) => handleOnCheck(e)}
        id={label}
        value={value}
        name={name}
        style={{
          backgroundColor: checkedState ? "#ee7320" : "transparent",
          accentColor: "#ee7320",
          color: "#fff",
          borderColor: "#ee7320",
          boxShadow: "#ee7320",
          outline: "#ee7320",
        }}
        {...props}
        className="cursor-pointer rounded-[4px] ring-primary checked:shadow-sm checked:-translate-y-[1px] checked:dark:shadow-gray-900 duration-150 appearance-none border w-4.5 h-4.5 before:text-white relative
       before:border-transparent before:dark:border-gray-200 before:w-[65%] before:rotate-45 before:translate-x-[40%] before:translate-y-[-20%]
        before:h-full before:border-b-[3px] before:border-r-[3px] before:absolute before:rounded-sm before:rounded-br-md-sm before:hidden before:checked:block"
      />
      <label
        className="cursor-pointer bottom-[1px] relative text-[15px] text-gray-700 dark:text-gray-200 font-semibold select-none"
        htmlFor={label}
      >
        {label ?? label}
      </label>
    </div>
  );
};

export default MyChecked;
