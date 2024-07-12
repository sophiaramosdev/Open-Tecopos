import { useState } from "react";
import { RadioGroup } from "@headlessui/react";
import { useController, UseControllerProps } from "react-hook-form";

export interface CustomRadioData {
  value: string | number;
  img?: string;
  name: string;
  elements?: Record<string, string | number | React.ReactNode>;
  endElement?: React.ReactNode;
}

interface CustomRadioIniterface {
  data: CustomRadioData[];
  action?: Function;
  className?: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function CustomRadio(
  props: UseControllerProps & CustomRadioIniterface
) {
  const { data, action, className } = props;
  const { field } = useController(props);
  const [selected, setSelected] = useState<number | string | null>(null);

  const onChange = (value: string | number) => {
    setSelected(value);
    field.onChange(value);
    action && action(value);
  };

  return (
    <div className="p-2">
      <RadioGroup value={selected} onChange={onChange}>
        <div className="space-y-4">
          {data?.map((item) => (
            <div className="flex gap-x-2">
              <RadioGroup.Option
                key={item.value}
                value={item.value}
                className={({ checked, active }) =>
                  classNames(
                    checked ? "border-2 border-slate-600" : "border-gray-300",
                    active ? "border-slate-600 ring-2 ring-slate-600" : "",
                    `cursor-pointer rounded-lg border bg-white px-6 py-4 shadow-sm focus:outline-none items-center text-sm grid grid-cols-${
                      item.elements
                        ? Object.values(item.elements).length + 2
                        : 2
                    } ${className ?? ""} w-full `
                  )
                }
              >
                {({ active, checked }) => (
                  <>
                    <span className="text-md font-semibold gap-2 inline-flex items-center col-span-2 ">
                      {item.img && (
                        <img
                          src={item.img}
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      {item.name}
                    </span>
                    {item.elements &&
                      Object.values(item.elements).map((elem, idx) =>
                        typeof elem === "string" || "number" ? (
                          <span key={idx} className="flex justify-center">
                            {elem}
                          </span>
                        ) : (
                          <div
                            key={idx}
                            className="flex justify-center flex-shrink"
                          >
                            {elem}
                          </div>
                        )
                      )}
                  </>
                )}
              </RadioGroup.Option>
              {item.endElement && (
                <div className="flex justify-center items-center flex-shrink">
                  {item.endElement}
                </div>
              )}
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
