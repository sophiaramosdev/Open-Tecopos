import { useField } from "formik";
import React from "react";

export const MyTextInputCurrency = ({ onChange, label, ...props }) => {
  // useField() returns [formik.getFieldProps(), formik.getFieldMeta()]
  // which we can spread on <input>. We can use field meta to show an error
  // message if the field is invalid and it has been touched (i.e. visited)
  const [field] = useField(props);
  return (
    <>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">$</span>
      </div>
      <input
        onChange={onChange}
        className="focus:ring-gray-500 focus:border-gray-500 block w-full pl-7 pr-28 sm:text-sm border-gray-300 rounded-md"
        {...field}
        {...props}
      />
    </>
  );
};
export default MyTextInputCurrency;
