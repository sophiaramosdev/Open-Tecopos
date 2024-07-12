import { useState } from "react";

import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";
import InputMask from 'react-input-mask';


interface InputProps {
  mask: string;
  label?: string;
  placeholder?: string;
  type?: "number" | "text" | "password";
  disabled?: boolean;
  stackedText?: string;
  textAsNumber?: boolean;
  numberAsCurrency?: { precision: number };
}

const showAsCurrency = (amount: number, precision: number) =>
  new Intl.NumberFormat("en-EN", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: precision,
  }).format(amount);

const InputMaskComponent = (props: UseControllerProps & InputProps) => {

  const {
    mask,
    label,
    placeholder,
    defaultValue,
    type,
    disabled,
    stackedText,
    numberAsCurrency,
    textAsNumber = false,

  } = props;

  const { field, fieldState } = useController(props);

  const initialValue =
    type === "number" && numberAsCurrency
      ? showAsCurrency(field.value || defaultValue, numberAsCurrency.precision)
      : field.value || defaultValue;

  const [input, setInput] = useState<string>(initialValue ?? "");

  return (
    <div className="py-2 w-full">
      {label && (
        <label
          htmlFor={label}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
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

          <InputMask 
 
            type={"text"}
            mask={mask} 
            value={input} 
            placeholder={mask && mask}
            
            disabled={disabled}
            onChange={(e) => {
              if (textAsNumber && type === "text") {
                if (
                  (e.target.value.charCodeAt(e.target.value.length - 1) >= 48 &&
                    e.target.value.charCodeAt(e.target.value.length - 1) <= 57) ||
                  e.target.value === ""
                ) {
                  setInput(e.target.value);
                  field.onChange(e.target.value);
                }
              }else if (numberAsCurrency && type === "number") {
                if((e.target.value.charCodeAt(e.target.value.length - 1) >= 48 &&
                e.target.value.charCodeAt(e.target.value.length - 1) <= 57) || [36,44,46].includes(e.target.value.charCodeAt(e.target.value.length - 1)) ||
              e.target.value === ""){
                setInput("$" + e.target.value.replace(/[$,]/g,""))
                field.onChange(Number(e.target.value.replace(/[$,]/g,"")))
              }
                
              } 
              else {
                setInput(e.target.value);
                field.onChange(
                  props?.type === "number"
                    ? Number(e.target.value)
                    : e.target.value
                );
              }
            }}
            className={`${
              fieldState.error
                ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "focus:ring-gray-400 border-gray-400 focus:border-gray-600 text-gray-500"
            } block w-full rounded-md sm:text-sm placeholder:text-slate-400 ${
              stackedText ? "rounded-l-none" : ""
            }`}

            
          >
          </InputMask>
          
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

export default InputMaskComponent;
