import { useEffect } from "react";
import { UseControllerProps, useController } from "react-hook-form";

interface CheckProps {
  label?: string;
  value: number | string;
  checked?: boolean;
  onChangeFunction?: Function;
}

const SingleRadio = (props: UseControllerProps & CheckProps) => {
  const { value, label, name, checked, onChangeFunction, defaultValue } = props;
  const { field } = useController(props);

  useEffect(() => {
    if (checked) {
      field.onChange(value);
    }
  }, []);

  return (
    <div className="inline-flex gap-2 items-center">
      <input
        name={name}
        type="radio"
        className="h-4 w-4 rounded-full border-gray-500 focus:bg-transparent text-slate-600 focus:ring-transparent"
        value={value}
        defaultChecked={field.value === value || checked}
        onChange={(e) => {
          field.onChange(e.currentTarget.value);
          if (onChangeFunction !== undefined) {
            onChangeFunction();
          }
        }}
      />
      {label && <label className="text-sm font-semibold">{label}</label>}
    </div>
  );
};

export default SingleRadio;
