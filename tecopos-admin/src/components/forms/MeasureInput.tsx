import { useEffect, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";

interface InputProps {
  label: string;
  placeholder?: string;
  measures: { key: string; value: string }[];
  showInline?: boolean;
  disabled?: boolean;
  disabledMeasure?: boolean;
  valueDefault?: { quantity: number; measure: string };
}

const MeasureInput = (props: UseControllerProps & InputProps) => {
  const {
    label,
    placeholder,
    measures,
    showInline,
    disabled,
    disabledMeasure,
    valueDefault,
  } = props;
  const { field, fieldState } = useController(props);

  const [input, setInput] = useState<{
    quantity?: number;
    measure?: string;
  }>(valueDefault ?? {quantity:0, measure: measures[0].key });

  useEffect(() => {
    field.onChange({ ...input });
  }, [input]);

  return (
    <div
      className={`${
        showInline ? "inline-flex items-center gap-3" : "flex-col"
      }`}
    >
      <label
        htmlFor={label}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative mt-1 rounded-md shadow-sm">
        <input
          type="number"
          min={0}
          step={0.01}
          className={`${
            fieldState.error
              ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "focus:ring-gray-500 border-gray-500 focus:border-gray-600 text-gray-500"
          } block w-full rounded-md  pr-10 sm:text-sm placeholder:text-slate-400`}
          value={input.quantity}
          placeholder={placeholder && placeholder}
          onChange={(e) => {
            setInput({
              ...input,
              quantity: Number(e.target.value),
            });
          }}
          disabled={disabled}
        />
        <div className="absolute top-0 right-0 flex gap-1 items-center pr-0">
          {fieldState.error && (
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          )}
          <select
            className=" rounded-md border-transparent border-l-gray-700 rounded-l-none bg-transparent py-2 pl-2 pr-7 text-gray-500 focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
            onChange={(e) => {
              setInput({ ...input, measure: e.target.value });
            }}
            value={input.measure}
            disabled={disabled||disabledMeasure}
          >
            {measures.map((item, idx) => (
              <option key={idx} value={item.key}>
                {item.value}
              </option>
            ))}
          </select>
        </div>
        {fieldState.error && (
          <p className=" absolute text-xs mt-1 text-red-600">
            {fieldState.error?.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default MeasureInput;
