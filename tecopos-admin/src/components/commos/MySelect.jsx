import { useField } from "formik";

export const MySelect = ({ label, ...props }) => {
  const [field] = useField(props);
  return (
    <div>
      <label
        htmlFor={props.id || props.name}
        className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
      >
        {label}
      </label>
      <select
        {...field}
        {...props}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
      />
    </div>
  );
};
export default MySelect;
