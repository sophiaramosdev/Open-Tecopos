import { useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";
import { LockClosedIcon } from "@heroicons/react/24/outline";

interface InputProps extends UseControllerProps {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  prefix: string;
}

const InputPrefix = (props: InputProps) => {
  const { label, placeholder, defaultValue, disabled, prefix } = props;

  const { field, fieldState } = useController(props);

  const [input, setInput] = useState<string>(
    defaultValue ? String(defaultValue) : ""
  );

  const paddingValue = prefix.length.toString();

  return (
    <div className="flex flex-col w-full col-span-2">
      <div className="relative  col-span-2">
        <div className="bg-white rounded-lg  w-full col-span-2">
          {label && (
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
          )}
          <div className="relative text-gray-500 ">
            <div className="absolute inset-y-0 left-3 my-auto h-6 flex items-center border-r pr-2">
              <span className="text-sm outline-none rounded-lg h-full">
                {prefix}
              </span>
            </div>
            <input
              type={"text"}
              className={`w-full pl-[5.5rem] appearance-none bg-transparent outline-none border focus:border-slate-600 shadow-sm rounded-lg ${
                fieldState.error
                  ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "focus:ring-gray-400 focus:border-gray-600 "
              } block w-full rounded-md sm:text-sm placeholder:text-slate-400 ${
                disabled
                  ? "border-gray-300 text-gray-400"
                  : "border-gray-500 text-gray-500"
              }`}
              placeholder={placeholder && placeholder}
              value={input}
              onChange={(e) => {
                if (
                  (e.target.value.charCodeAt(e.target.value.length - 1) >= 48 &&
                    e.target.value.charCodeAt(e.target.value.length - 1) <=
                      57) ||
                  (e.target.value.charCodeAt(e.target.value.length - 1) ===
                    46 &&
                    !e.target.value
                      .slice(0, e.target.value.length - 1)
                      .includes(".")) ||
                  e.target.value === ""
                ) {
                  setInput(e.target.value);
                  field.onChange(Number(e.target.value));
                }
              }}
            />
            {fieldState.error && (
              <>
                <div className="pointer-events-none absolute inset-y-0 right-0 top-2 pr-3">
                  <ExclamationCircleIcon
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                </div>

                <p className="absolute -bottom-5 text-xs text-red-600 flex flex-shrink-0">
                  {fieldState.error?.message}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPrefix;
