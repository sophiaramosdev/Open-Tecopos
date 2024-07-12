import React, { Fragment, PropsWithChildren, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type Size = "m" | "l" | "xl";

interface ModalProps {
  state: boolean;
  close: Function;
  size?: Size; //s, m , l => default s
}

export default function Modal({
  state,
  close,
  children,
  size,
}: ModalProps & PropsWithChildren) {
  //-----------Close modal with keyboard ESC------------>
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close]);
  //-----------Close modal with keyboard ESC------------>
  return (
    <Transition.Root show={state} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-40 w-screen h-screen"
        onClose={() => null}
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
          <div className="flex min-h-full justify-center p-4 text-center items-center lg:p-0">
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
                className={`relative transform overflow-y-visible rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all lg:my-8 ${
                  size === "m"
                    ? "lg:w-1/2"
                    : size === "l"
                    ? "lg:w-4/5"
                    : size === "xl"
                    ? "min-w-[90vw] min-h-[110vh]"
                    : "lg:w-1/3"
                } lg:h-1/2 lg:max-w-7xl lg:p-6`}
              >
                <div className="fixed right-0 top-2 p-3 lg:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => close(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="pt-5">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
