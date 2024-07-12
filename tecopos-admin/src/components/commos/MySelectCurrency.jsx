import { useField } from "formik";
import React from "react";

export const MySelectCurrency = ({ className, label, ...props }) => {
  const [field, meta] = useField(props);
  return (
    <div
      className={`${className} absolute inset-y-0 right-0 flex items-center`}
    >
      <label htmlFor={props.id || props.name} className="sr-only">
        {label}
      </label>
      <select
        {...field}
        {...props}
        className="focus:ring-gray-500 focus:border-gray-500 h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 sm:text-sm rounded-md"
      />
    </div>
  );
};
export default MySelectCurrency;
