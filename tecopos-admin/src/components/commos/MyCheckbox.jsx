import { useField } from "formik";
import React from "react";

export const MyCheckbox = ({ labelFoc, children, ...props }) => {
  // children2 has on props, but i think is not necessary...
  // React treats radios and checkbox inputs differently other input types, select, and textarea.
  // Formik does this too! When you specify `type` to useField(), it will
  // return the correct bag of props for you -- a `checked` prop will be included
  // in `field` alongside `name`, `value`, `onChange`, and `onBlur`
  const [field, name] = useField({ ...props, type: "checkbox" });
  return (
    <div className="flex items-center">
      <div className="flex items-center h-4">
        <input
          type="checkbox"
          className="focus:ring-orange-500 h-5 w-5 text-orange-500 border-orange-300 rounded"
          {...field}
          {...props}
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor={name} className="font-medium text-slate-900">
          {" "}
          {children}
        </label>
      </div>
    </div>
  );
};
export default MyCheckbox;
