import { useState, useEffect, useRef } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";
import { LockClosedIcon } from "@heroicons/react/24/outline";

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: "number" | "text" | "password" | "textOnly";
  disabled?: boolean;
  stackedText?: string;
  textAsNumber?: boolean;
  numbersAndDots?: boolean;
  numberAsCurrency?: { precision: number };
  showInline?: boolean
  maxLength?: number
  autoFocus?:boolean
}

const showAsCurrency = (amount: number, precision: number) =>
  new Intl.NumberFormat("en-EN", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: precision,
  }).format(amount);

const Input = (props: UseControllerProps & InputProps) => {
  const {
    label,
    placeholder,
    defaultValue,
    type = "text",
    disabled,
    stackedText,
    numberAsCurrency,
    textAsNumber,
    numbersAndDots,
    showInline,
    maxLength,
    autoFocus
  } = props;
  const { field, fieldState } = useController(props);

  const initialValue =
    type === "number" && numberAsCurrency
      ? showAsCurrency(
        field.value ?? defaultValue ?? 0,
        numberAsCurrency.precision
      )
      : field.value ?? defaultValue;

  const [input, setInput] = useState<string>(initialValue ?? "");

   const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (type === "number") field.onChange(defaultValue ?? 0);
  }, []);

  useEffect(() => {
    if (inputRef.current && autoFocus) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className={`w-full ${showInline ? "inline-flex gap-2 items-center" : ""}`}>
      {label && (
        <label
          htmlFor={label}
          className={`block text-sm font-medium  ${disabled ? "text-gray-400" : "text-gray-700"
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
            className={`${fieldState.error
              ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "focus:ring-gray-400 border-gray-400 focus:border-gray-600 text-gray-500"
              } rounded-md sm:text-sm p-2 border border-r-0 rounded-r-none w-full text-right`}
          >
            {stackedText && stackedText}
          </span>
        )}
        <input
         ref={inputRef}
          type={type === "password" ? type : "text"}
          className={`${fieldState.error
            ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "focus:ring-gray-400 focus:border-gray-600 "
            } block w-full rounded-md sm:text-sm placeholder:text-slate-400 ${stackedText ? "rounded-l-none" : ""
            } ${disabled ? "border-gray-300 text-gray-400" : "border-gray-500 text-gray-500"}`}
          placeholder={placeholder && placeholder}
          value={input}
          maxLength={maxLength && maxLength}
          onChange={(e) => {
            if (type === "textOnly") {
              // Ensure that only letters are allowed
              const onlyLetters = /^[a-zA-Z\s]*$/;
              if (onlyLetters.test(e.target.value) || e.target.value === "") {
                setInput(e.target.value);
                field.onChange(e.target.value);
              }
            } else if (textAsNumber && type === "text") {
              if (
                (e.target.value.charCodeAt(e.target.value.length - 1) >= 48 &&
                  e.target.value.charCodeAt(e.target.value.length - 1) <= 57) ||
                e.target.value.charCodeAt(e.target.value.length - 1) === 43 ||
                e.target.value === ""
              ) {
                setInput(e.target.value);
                field.onChange(e.target.value);
              }
            } else if (numbersAndDots && type === "text") {
              if (
                (e.target.value.charCodeAt(e.target.value.length - 1) >= 48 &&
                  e.target.value.charCodeAt(e.target.value.length - 1) <= 57) ||
                e.target.value.charCodeAt(e.target.value.length - 1) === 46 ||
                e.target.value === ""
              ) {
                setInput(e.target.value);
                field.onChange(e.target.value);
              }
            } else if (numberAsCurrency && type === "number") {
              if (
                (e.target.value.charCodeAt(e.target.value.length - 1) >= 48 &&
                  e.target.value.charCodeAt(e.target.value.length - 1) <= 57) ||
                [36, 44, 46].includes(
                  e.target.value.charCodeAt(e.target.value.length - 1)
                ) ||
                e.target.value === ""
              ) {
                setInput("$" + e.target.value.replace(/[$,]/g, ""));
                field.onChange(Number(e.target.value.replace(/[$,]/g, "")));
              }
            } else if (type === "number") {
              if (
                (e.target.value.charCodeAt(e.target.value.length - 1) >= 48 &&
                  e.target.value.charCodeAt(e.target.value.length - 1) <= 57) ||
                (e.target.value.charCodeAt(e.target.value.length - 1) === 46 &&
                  !e.target.value
                    .slice(0, e.target.value.length - 1)
                    .includes(".")) ||
                e.target.value === ""
              ) {
                setInput((e.target.value));
                field.onChange(Number(e.target.value));
              }
            } else {
              setInput(e.target.value);
              field.onChange(e.target.value);
            }
          }
          }
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

            <p className="absolute -bottom-5 text-xs text-red-600 flex flex-shrink-0">
              {fieldState.error?.message}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Input;
