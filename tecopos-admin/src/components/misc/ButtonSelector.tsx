import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface SelectorIterface {
  id: number;
  name: string;
}

interface ButtonSelectorProps {
  selected: SelectorIterface | null;
  setSelected: (selected: SelectorIterface) => void;
  data: SelectorIterface[];
  defaultSelected?: SelectorIterface;
}

export default function ButtonSelector({
  selected,
  setSelected,
  data,
}: ButtonSelectorProps) {
  return (
    <Listbox
      value={selected}
      onChange={setSelected}
      by={(a, z) => a?.id === z?.id}
    >
      {({ open }) => (
        <>
          <div className="relative">
            <div className="inline-flex divide-x divide-slate-100 rounded-md shadow-sm">
              <div className="inline-flex items-center gap-x-1.5 rounded-l-md bg-slate-200  text-gray-600 px-3 py-2 shadow-sm">
                <CheckIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                <p className="text-sm font-semibold line-clamp-1">{selected?.name}</p>
              </div>
              <Listbox.Button className="inline-flex items-center rounded-l-none rounded-r-md bg-slate-200 p-2 hover:bg-slate-300">
                <ChevronDownIcon
                  className="h-5 w-5 text-gray-600"
                  aria-hidden="true"
                />
              </Listbox.Button>
            </div>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute right-0 z-10 mt-2 w-72 origin-top-right divide-y divide-gray-200 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {data.map((option, idx) => (
                  <Listbox.Option
                    key={idx}
                    className={({ active }) =>
                      classNames(
                        active ? "bg-slate-100 text-gray-500" : "text-gray-900",
                        "cursor-default select-none p-4 text-sm"
                      )
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <div className="flex flex-col">
                        <div className="flex justify-between">
                          <p
                            className={
                              selected ? "font-semibold " : "font-normal"
                            }
                          >
                            {option.name}
                          </p>
                          {selected ? (
                            <span
                              className={
                                active ? "text-gray-500" : "text-slate-400"
                              }
                            >
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  );
}
