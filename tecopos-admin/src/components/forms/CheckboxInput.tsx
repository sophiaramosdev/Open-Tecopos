import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { UseControllerProps, useController } from "react-hook-form";
interface CheckboxInputProps extends UseControllerProps {
  label?: string;
  disabled?: boolean;
  showInline?: boolean;
}

const CheckboxInput = (props: CheckboxInputProps) => {
  const { label, disabled, showInline } = props;
  const { field, fieldState } = useController(props);

  return (
    <div className={`flex items-center ${showInline ? "gap-2" : ""}`}>
      <input
        type="checkbox"
        id={label}
        className="h-4 w-4 rounded cursor-pointer border-gray-500 focus:bg-transparent text-slate-600 focus:ring-transparent"
        {...field}
        checked={field.value}
        value={field.value ? "1" : "0"}
        disabled={disabled}
      />
      {label && (
        <label
          htmlFor={label}
          className={`block ml-2 text-sm font-medium ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {label}
        </label>
      )}
      {fieldState.error && (
        <div className="relative">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 absolute top-2 right-2" />
          <p className="text-xs text-red-600 mt-1">
            {fieldState.error.message}
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckboxInput;
