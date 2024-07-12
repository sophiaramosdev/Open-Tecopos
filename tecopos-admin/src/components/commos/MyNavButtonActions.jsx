import { Transition } from "@headlessui/react";
import React, { Fragment } from "react";
import { Menu } from "heroicons-react";

const MyNavButtonActions = ({ onClick, textBtn }) => {
  return (
    <>
      <div className="flex items-center">
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <button className="inline-flex justify-center w-full rounded-md   shadow-sm px-4 py-2 bg-blue-700 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-100 focus:ring-blue-500">
              {textBtn}
              <svg
                fill="#fff"
                className="-mr-1 ml-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
              <Menu.Item>
                <button
                  type="button"
                  onClick={onClick}
                  className={
                    "text-slate-700 block px-4 py-2 text-sm w-full h-full text-left hover:text-slate-900 hover:font-bold "
                  }
                >
                  Nuevo
                </button>
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </>
  );
};

export default MyNavButtonActions;
