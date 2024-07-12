import { useEffect, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { size } from "lodash";

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: "number" | "text";
  disabled?: boolean;
  size?: number;
}

const TextArea = (props: UseControllerProps & InputProps) => {
  const { label, placeholder, disabled, size, defaultValue } = props;
  const { field, fieldState } = useController(props);

  const [input, setInput] = useState<string>(field.value ?? props.defaultValue ?? "")

  useEffect(()=>{
    if(defaultValue){
      field.onChange(defaultValue);
      setInput(defaultValue);
    }
  },[])

  useEffect(() => {
    if (field.value === undefined) setInput(defaultValue??"");
  }, [field.value]);

  return (
    <div className="py-2">
      <label
        htmlFor={label}
        className={`block text-sm font-medium  ${
          disabled ? "text-gray-400" : "text-gray-700"
        }`}
      >
        <span className="inline-flex items-center">
          {label}
          {disabled && <LockClosedIcon className="px-2 h-4" />}
        </span>
      </label>
      <div className="relative mt-1 rounded-md shadow-sm">
        <textarea
          disabled={disabled}
          {...field}
          className={`${
            fieldState.error
              ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "focus:ring-slate-400 border-slate-400 focus:border-slate-600 text-slate-400"
          } block w-full rounded-md  pr-10 sm:text-sm placeholder:text-slate-400 scrollbar-thin min-h-[${size}px]`}
          value={input}
          placeholder={placeholder && placeholder}
          onChange={(e) => {
            field.onChange(e.target.value);
            setInput(e.target.value);
          }}
        />

        {fieldState.error && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 -top-6 flex items-center pr-3">
              <ExclamationCircleIcon
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>

            <p className="mt-2 text-sm text-red-600">
              {fieldState.error?.message}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default TextArea;