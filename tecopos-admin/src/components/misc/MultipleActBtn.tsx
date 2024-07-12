import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import LoadingSpin from "./LoadingSpin";

export interface BtnActions {
  icon?: React.ReactNode;
  loading?: boolean;
  title: string;
  action?: (close:Function) => void;
}

interface MultiBtn {
  btnIcon?: React.ReactNode;
  btnName?: string;
  items: BtnActions[];
  size?: "s" | "m";
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MultipleActBtn({
  btnIcon,
  btnName,
  items,
  size = "m",
}: MultiBtn) {
  return (
    <div className="inline-flex shadow-sm flex-shrink-0">
      <Menu as="div" className="relative -ml-px block">
        <Menu.Button className="relative inline-flex items-center gap-2 rounded-md bg-white px-2 py-2 text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 border-none">
          <span
            className={`inline-flex gap-2 justify-center items-center pl-2 ${
              size === "s" ? "text-sm" : ""
            }`}
          >
            {btnIcon && btnIcon} {btnName ?? "Acciones"}
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          </span>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className="absolute right-0 z-10 mt-2 -mr-1 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <div className="p-1">
              {items.map((item) => (
                <Menu.Item key={item.title}>
                  {({ active, close }) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        item.action && item.action(close);
                      }}
                      className={classNames(
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                        "flex items-center gap-2 w-full rounded-md p-2 text-sm"
                      )}
                    >
                      {item?.loading ? (
                        <LoadingSpin color="slate-600" />
                      ) : (
                        item.icon && item.icon
                      )}
                      {item.title}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}