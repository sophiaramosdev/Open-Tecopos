/* eslint-disable react-hooks/exhaustive-deps */
import { ChangeEvent, useEffect, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";

interface InputProps {
  label?: string;
  placeholder?: string;
  currencies: string[];
  defaultCurrency?: string | null;
  showInline?: boolean;
  disabled?: boolean;
  byDefault?: { price: number; codeCurrency?: string };
  min?: number;
  max?: number;
  systemPriceId?: number;
}

const CurrencyInput = (props: UseControllerProps & InputProps) => {
  const {
    label,
    placeholder,
    currencies,
    showInline,
    disabled,
    byDefault,
    min,
    max,
    defaultCurrency,
    systemPriceId,
  } = props;
  const { field, fieldState } = useController(props);

  const [input, setInput] = useState<{ price: string; codeCurrency: string }>({
    price: "",
    codeCurrency: byDefault?.codeCurrency ?? defaultCurrency ?? currencies[0],
  });

  useEffect(() => {
    if (field.value === undefined) {
      setInput({
        price: "",
        codeCurrency:
          byDefault?.codeCurrency ?? defaultCurrency ?? currencies[0],
      });
    }
  }, [field.value]);

  useEffect(() => {
    if (byDefault) {
      field.onChange({
        price: byDefault.price,
        codeCurrency:
          byDefault?.codeCurrency ?? defaultCurrency ?? currencies[0],
        systemPriceId,
      });
      input.price === "" &&
        setInput({
          price: byDefault.price.toString(),
          codeCurrency: byDefault?.codeCurrency ?? currencies[0],
        });
    } else if (defaultCurrency && !byDefault) {
      field.onChange({
        codeCurrency: defaultCurrency,
        systemPriceId,
      });
      setInput({
        price: "",
        codeCurrency: defaultCurrency,
      });
    }
  }, [byDefault]);

  const onChangeHelper = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const position = value.length - 1;
    const code = value.charCodeAt(position);

    if ((code >= 48 && code <= 57) || code === 46 || value === "") {
      if (code === 46 && value.includes(".") && value.indexOf(".") !== position)
        return;
      if (max && Number(e.target.value) > max) return;
      if (min && Number(e.target.value) < min) return;
      setInput({ ...input, price: value });
      field.onChange({
        ...field.value,
        price: Number(e.target.value),
        codeCurrency:
          field?.value?.codeCurrency ?? defaultCurrency ?? currencies[0],
        systemPriceId,
      });
    }
  };

  return (
    <div
      className={`${
        showInline ? "inline-flex items-center gap-2 " : "flex-col"
      } py-1 w-full`}
    >
      {label && (
        <label
          htmlFor={label}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm w-full">
        <input
          type="text"
          className={`${
            fieldState.error
              ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "focus:ring-gray-500 border-gray-400 focus:border-gray-600 text-gray-500"
          } block w-full rounded-md  pr-10 sm:text-sm placeholder:text-slate-400`}
          placeholder={placeholder && placeholder}
          onChange={onChangeHelper}
          disabled={disabled}
          value={input.price}
        />
        <div className="absolute top-0 right-0 flex gap-1 items-center pr-0">
          {fieldState.error && (
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          )}

          <select
            className=" rounded-md border-transparent bg-transparent py-2 pl-2 pr-7 text-gray-500 focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
            onChange={(e) => {
              setInput({ ...input, codeCurrency: e.target.value });
              field.onChange({ ...field.value, codeCurrency: e.target.value });
            }}
            disabled={disabled}
            value={input.codeCurrency}
          >
            {currencies?.map((item, idx) => (
              <option key={idx} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        {fieldState.error && (
          <p className="mt-2 text-sm text-red-600">
            {fieldState.error?.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default CurrencyInput;