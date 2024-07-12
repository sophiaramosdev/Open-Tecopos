import React, { useState, useEffect } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";

interface TimeInputProps extends UseControllerProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showInline?: boolean;
  minTime?: string;
  maxTime?: string;
}

const TimeInput = (props: TimeInputProps) => {
  const {
    label,
    placeholder,
    defaultValue,
    disabled,
    showInline,
    minTime,
    maxTime,
  } = props;
  const { field, fieldState } = useController(props);

  const [input, setInput] = useState<string>(defaultValue ?? "");

  useEffect(() => {
    setInput(defaultValue ?? "");
  }, [defaultValue]);

  return (
    <div
      className={`w-full ${showInline ? "inline-flex gap-2 items-center" : ""}`}
    >
      {label && (
        <label
          htmlFor={label}
          className={`block text-sm font-medium  ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {label}
        </label>
      )}
      <div className="relative mt-1 rounded-md shadow-sm inline-flex items-center w-full">
        <input
          type="time"
          //step="3600"
          className={`${
            fieldState.error
              ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "focus:ring-gray-400 focus:border-gray-600 "
          } block w-full rounded-md sm:text-sm placeholder:text-slate-400
            ${
              disabled
                ? "border-gray-300 text-gray-400"
                : "border-gray-500 text-gray-500"
            }`}
          placeholder={placeholder && placeholder}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            field.onChange(e.target.value);
          }}
          disabled={disabled}
          min={minTime}
          max={maxTime}
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
  );
};

export default TimeInput;
