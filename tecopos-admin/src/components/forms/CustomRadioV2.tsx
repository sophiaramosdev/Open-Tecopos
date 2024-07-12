import { useState } from "react";
import { RadioGroup } from "@headlessui/react";
import { useController, UseControllerProps } from "react-hook-form";

export interface CustomRadioData2 {
  value: string | number;
  img?: string;
  name: string;
  measure: React.ReactNode;
  stock: React.ReactNode;
  input: React.ReactNode;
  price: React.ReactNode;
  endElement?: React.ReactNode;
}

interface CustomRadioIniterface {
  data: CustomRadioData2[];
  action?: Function;
  className?: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function CustomRadioV2(
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
        <div className="space-y-4 flex flex-col">
          {data?.map((item) => (
            <div className="flex gap-x-2">
              <RadioGroup.Option
                key={item.value}
                value={item.value}
                className={({ checked, active }) =>
                  classNames(
                    checked ? "border-2 border-slate-600" : "border-gray-300",
                    active ? "border-slate-600 ring-2 ring-slate-600" : "",
                    `cursor-pointer rounded-lg border bg-white px-6 py-4 shadow-sm focus:outline-none items-center text-sm  ${
                      className ?? ""
                    } flex flex-col bg-black `
                  )
                }
              >
                {({ active, checked }) => (
                  <>
                  <section className="grid grid-cols-2 gap-y-3 gap-x-2 min-w-full">

                    <span className="text-md font-semibold gap-2 flex  col-span-2 justify-start items-center   ">
                      {item.img && (
                        <img
                          src={item.img}
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      {item.name}
                    </span>
                    <article >
                      {item.measure && <div>{item.measure}</div>}
                    </article>
                    <article>{item.stock && <div>{item.stock}</div>}</article>
                    <article>{item.input && <div>{item.input}</div>}</article>
                    <article>{item.price && <div>{item.price}</div>}</article>
                  </section>

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
