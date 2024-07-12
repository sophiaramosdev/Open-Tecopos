import { useField } from "formik";
import React from "react";

export const MySelectInput = ({ label, options, ...props }) => {
  const [field] = useField(props);

  return (
    <div className={`${props.inputclass}`}>
      <label
        htmlFor={props.id || props.name}
        className="block capitalize text-sm font-medium mt-2 text-gray-700"
      >
        {label}
      </label>
      <select
        className="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
        value={(item) => (item.name ? item.name : item.value)}
        {...field}
        {...props}
      >
        {options?.map((item, index) => (
          <option
            value={item.name ? item.name : item.code}
            name={item.id}
            key={index}
          >
            {item.value}
          </option>
        ))}
      </select>
    </div>
  );
};
export default MySelectInput;
