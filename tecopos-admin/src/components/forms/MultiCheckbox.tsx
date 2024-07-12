import { useController, UseControllerProps } from "react-hook-form";
import { useState } from "react";

interface CheckProps {
  label?: string;
  data: { value: number | string; name: string; label: string }[];
  displayCol?: boolean;
}

export default function MultiCheckbox(props: UseControllerProps & CheckProps) {
  const { data, displayCol, label } = props;
  const { field, fieldState } = useController(props);

  const [origins, setOrigins] = useState<
    { value: number | string; name: string }[] | []
  >([]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentValue = e.target.value;
    let newOrigins;
    if (e.target.checked) {
      newOrigins = [
        ...origins,
        ...data.filter((item) => item.value === currentValue),
      ];
    } else {
      newOrigins = origins.filter((item) => item.value !== currentValue);
    }

    setOrigins(newOrigins);
    field.onChange(newOrigins.map((newOrigin) => newOrigin.value).toString());
  };

  return (
    <fieldset className="inline-flex gap-2 mt-2">
      {label && (
        <label
          htmlFor="label"
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      <div className={`${displayCol ? "flex flex-col gap-2" : "flex flex-wrap gap-3"}`}>
        {data.map((item, idx) => (
          <div key={idx} className="flex items-start">
            <div className="flex h-6 items-center">
              <input
                id={item.name}
                name={item.name}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 focus:bg-transparent text-slate-600 focus:ring-transparent"
                onChange={(e) => onChange(e)}
                value={item.value}
                checked={
                  origins.filter((check) => check.value === item.value)
                    .length !== 0
                }
              />
            </div>
            <div className="ml-2 text-sm leading-6">
              <label htmlFor={item.name} className="font-medium text-gray-700">
                {item.label}
              </label>{" "}
            </div>
          </div>
        ))}
      </div>
      {fieldState.error && (
        <span className="text-xs text-red-600">{fieldState.error.message}</span>
      )}
    </fieldset>
  );
}
