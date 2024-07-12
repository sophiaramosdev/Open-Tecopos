import { useState, useEffect, ChangeEvent } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";
import { LockClosedIcon } from "@heroicons/react/24/outline";

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: "number" | "text" | "password" | "textNumberMode";
  disabled?: boolean;
  stackedText?: string;
  showInline?: boolean;
  maxLength?: number;
}

const Input = (props: UseControllerProps & InputProps) => {
  const {
    label,
    placeholder,
    type = "text",
    disabled,
    stackedText,
    showInline,
    maxLength,
    defaultValue,
  } = props;
  const { field, fieldState } = useController(props);

  const [input, setInput] = useState<string>("");

  useEffect(() => {
    if (!!defaultValue) {
      setInput(defaultValue??"");
      field.onChange(defaultValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if ([undefined, null].includes(field.value)) {
      setInput("");
    }else{
      setInput(field.value)
    }
  }, [field.value]);

  const onChangeHelper = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const position = value.length - 1;
    const code = value.charCodeAt(position);

    switch (type) {
      case "number":
      case "textNumberMode":
        if ((code >= 48 && code <= 57) || code === 46 || value === "") {
          if (
            code === 46 &&
            value.includes(".") &&
            value.indexOf(".") !== position
          )
            break;
          setInput(value);
          field.onChange(type === "number" ? Number(value) : value);
        }
        break;

      default:
        setInput(value);
        field.onChange(value);
        break;
    }
  };

  return (
    <div
      className={`w-full ${showInline ? "inline-flex gap-2 items-center" : ""}`}
    >
      {label && (
        <label
          htmlFor={label}
          className={`flex-shrink-0 text-sm font-medium  ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          <span className="inline-flex items-center">
            {label}
            {disabled && <LockClosedIcon className="px-2 h-4" />}
          </span>
        </label>
      )}
      <div className="relative mt-1 rounded-md shadow-sm inline-flex items-center w-full">
        {stackedText && (
          <span
            className={`${
              fieldState.error
                ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "focus:ring-gray-400 border-gray-400 focus:border-gray-600 text-gray-500"
            } rounded-md sm:text-sm p-2 border border-r-0 rounded-r-none w-full text-right`}
          >
            {stackedText && stackedText}
          </span>
        )}
        <input
          type={type === "password" ? "password" : "text"}
          className={`${
            fieldState.error
              ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "focus:ring-gray-400 focus:border-gray-600 "
          } block w-full rounded-md sm:text-sm placeholder:text-slate-400 ${
            stackedText ? "rounded-l-none" : ""
          } ${
            disabled
              ? "border-gray-300 text-gray-400"
              : "border-gray-500 text-gray-500"
          }`}
          placeholder={placeholder && placeholder}
          value={input}
          maxLength={maxLength && maxLength}
          onChange={onChangeHelper}
          disabled={disabled}
        />

        {fieldState.error && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 top-2 pr-3">
              <ExclamationCircleIcon
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>

            <p className="absolute -bottom-4 text-xs text-red-600 flex flex-shrink-0">
              {fieldState.error?.message}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Input;
