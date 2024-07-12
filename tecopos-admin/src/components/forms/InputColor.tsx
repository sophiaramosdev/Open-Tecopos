import { useState, useEffect, Fragment } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { useController, UseControllerProps } from "react-hook-form";
import { LockClosedIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ChromePicker, ColorResult } from "react-color";
import Modal from "../misc/GenericModal";
import { Dialog, Transition } from "@headlessui/react";
import Button from "../misc/Button";

interface InputColorProps {
  label?: string;
  defaultValue?: string;
  disabled?: boolean;
}

const InputColor = (props: UseControllerProps & InputColorProps) => {
  const { label, defaultValue, disabled } = props;
  const { field, fieldState } = useController(props);

  const generateRandomColor = () => {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
  };

  const [color, setColor] = useState<string>(
    defaultValue || generateRandomColor()
  );
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  useEffect(() => {
    field.onChange(color);
  }, [color]);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={label}
          className={`block text-sm font-medium ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          <span className="inline-flex items-center">
            {label}
            {disabled && <LockClosedIcon className="px-2 h-4" />}
          </span>
        </label>
      )}
      <div className="relative mt-1">
        <div
          className="w-full h-10 rounded-md cursor-pointer border-2 border-gray-400 "
          style={{ backgroundColor: color }}
          onClick={() => setShowColorPicker(!showColorPicker)}
        />

        {showColorPicker && (
          <Transition.Root show={showColorPicker} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-40 w-screen h-screen"
              onClose={() => setShowColorPicker(false)}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

              <div className="fixed inset-0  z-30 overflow-y-auto scrollbar-thin">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  >
                    <Dialog.Panel
                      className={`relative transform overflow-y-visible rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8`}
                    >
                      <div className="fixed right-0 top-1 p-3 mb-3 sm:block">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                          onClick={() => setShowColorPicker(false)}
                        >
                          <span className="sr-only">Close</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="pt-5">
                        <ChromePicker
                          color={color}
                          onChange={(colorResult: ColorResult) =>
                            setColor(colorResult.hex)
                          }
                        />
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button
                          name="Aceptar"
                          action={() => setShowColorPicker(false)}
                          color="slate-600"
                        />
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
        )}

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

export default InputColor;
