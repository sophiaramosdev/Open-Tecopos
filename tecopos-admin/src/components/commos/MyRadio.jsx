import { useField } from "formik";
import React from "react";

export const MyRadio = ({ label, customFunction,...props }) => {
  const [field] = useField(props);

  return (
    <div className="flex items-center">
      <input
        type="radio"
        className="w-4 h-4 text-primary bg-slate-100 border-slate-300 focus:ring-primary dark:focus:ring-primary dark:ring-offset-primary focus:ring-2 dark:bg-primary dark:border-primary"
        {...field}
        {...props}
      />

      <label
        htmlFor={props.id || props.name}
        onClick={customFunction}
        className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-300"
      >
        {label}
      </label>
    </div>
  );
};
export default MyRadio;
