import { useField } from "formik";
import React from "react";

export const MyTextarea = ({ label, ...props }) => {
  const [field] = useField(props);
  return (
    <div className={`${props.areaclass}`}>
      <label
        htmlFor={props.id || props.name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <textarea
        rows={props.row}
        className="shadow-sm h-auto resize-none focus:ring-gray-500 focus:border-gray-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
        {...field}
        {...props}
      />
    </div>
  );
};
export default MyTextarea;
