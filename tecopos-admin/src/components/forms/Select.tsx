import { Fragment, useState, useEffect } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { SelectInterface } from "../../interfaces/InterfacesLocal";
import Modal from "../misc/GenericModal";
import Button from "../misc/Button";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface InputProps {
  label?: string;
  defaultValue?: string | number | null;
  disabled?: boolean;
  data: Array<SelectInterface>;
  className?: string;
  warning?: string;
  placeholder?: string;
  showInline?: boolean;
}

export default function Select(props: UseControllerProps & InputProps) {
  const { field, fieldState } = useController(props);
  const {
    className,
    label,
    data,
    disabled,
    defaultValue,
    warning,
    placeholder,
    showInline,
  } = props;
  const [selected, setSelected] = useState<SelectInterface | null>(null);

  const [warningModal, setwarningModal] = useState<{
    state: boolean;
    helper: any;
  }>({
    state: false,
    helper: null,
  });

  useEffect(() => {
    const current = data.find(
      (item) => item.id === defaultValue || field.value === item.id
    );
    if (current) {
      setSelected(current);
      field.onChange(current.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  return (
    <>
      <div
        className={
          className
            ? className
            : `${showInline ? "inline-flex w-full gap-2" : ""}`
        }
      >
        <Listbox
          value={selected}
          onChange={(e) => {
            if (warning !== undefined && warning !== null) {
              setwarningModal({ state: true, helper: e });
            } else {
              setSelected(e);
              field.onChange(e.id);
            }
          }}
          disabled={disabled}
          defaultValue={field.value}
        >
          {({ open }) => (
            <>
              {label && (
                <Listbox.Label
                  className={`flex flex-shrink-0 text-sm font-medium ${
                    disabled ? "text-gray-400" : "text-gray-700"
                  } first-letter:uppercase`}
                >
                  <span className="inline-flex items-center">
                    {label}
                    {disabled && <LockClosedIcon className="px-2 h-4" />}
                  </span>
                </Listbox.Label>
              )}
              <div className="relative mt-1 w-full">
                <Listbox.Button
                  className={`${
                    fieldState.error
                      ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : `focus:ring-gray-500 ${
                          disabled ? "border-gray-300" : "border-gray-400"
                        } focus:border-gray-600 text-gray-500`
                  } border relative w-full cursor-pointer rounded-md bg-white py-2 pl-3 pr-10 text-left shadow-sm sm:text-sm`}
                  {...field}
                >
                  <span className="block truncate">
                    {selected?.name
                      ? selected?.name
                      : data.length !== 0
                      ? placeholder
                        ? placeholder
                        : "Seleccione"
                      : "Sin opciones que mostrar"}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </Listbox.Button>

                <Transition
                  show={open}
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm scrollbar-thin scrollbar-track-slate-50 scrollbar-thumb-slate-400">
                    {data.map((item) => (
                      <Listbox.Option
                        key={item.id}
                        className={({ active }) =>
                          classNames(
                            active
                              ? "text-white bg-slate-600"
                              : "text-gray-900",
                            "relative cursor-default select-none py-2 pl-3 pr-9"
                          )
                        }
                        disabled={item.disabled}
                        value={item}
                      >
                        {({ selected, active, disabled }) => (
                          <>
                            <span
                              className={classNames(
                                selected
                                  ? "font-semibold"
                                  : `${
                                      disabled ? "text-gray-300" : "font-normal"
                                    }`,
                                "block truncate"
                              )}
                            >
                              {item.name}
                            </span>

                            {selected && (
                              <span
                                className={classNames(
                                  active ? "text-white" : "text-slate-600",
                                  "absolute inset-y-0 right-0 flex items-center pr-4"
                                )}
                              >
                                <CheckIcon
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
                {fieldState.error && (
                  <>
                    <div className="absolute pointer-events-none  inset-y-0 right-5 flex items-center pr-3">
                      <ExclamationCircleIcon
                        className="h-5 w-5 text-red-500"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="absolute text-xs text-red-600">
                      {fieldState.error.message}
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </Listbox>
      </div>

      {warningModal.state && (
        <Modal state={warningModal.state} close={setwarningModal}>
          <p className="text-center text-red-600 font-semibold">¡Atención!</p>
          <p>{warning}</p>

          <div className="flex w-full justify-between mt-4">
            <Button
              name="No"
              color="slate-600"
              type="button"
              action={() => {
                setwarningModal({ state: false, helper: null });
              }}
            />
            <Button
              name="Sí, entiendo lo que hago"
              color="red-600"
              type="button"
              action={() => {
                setSelected(warningModal.helper);
                field.onChange(warningModal.helper.id);
                setwarningModal({ state: false, helper: null });
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
