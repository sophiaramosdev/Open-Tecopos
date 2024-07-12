//el item del filtro que requiera poner en null la consulta se tiene que poner id:0 (el elemento button no acepta nul como valor del parámetro value)

import React, { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export interface FilterItems {
  id:string|number;  
  name: string;
  current:boolean;
  action: (value:string|number|null)=>void;
}

export interface FilterOptions {
  filterType: string;
  allowMultiple?: boolean;
  filterItems: FilterItems[];
}

interface FilterProps {
  icon?: React.ReactNode;
  filters: FilterOptions[];
}

const FiltersComponent = ({ icon, filters }: FilterProps) => {
  return (
    <>
      <div className="inline-flex shadow-sm flex-shrink-0">
        <Menu as="div" className="relative -ml-px block">
          <Menu.Button className="relative inline-flex items-center gap-2 rounded-md bg-white px-2 py-2 text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 border-none">
            <span className="inline-flex gap-2 justify-center items-center pl-2">
              {icon && icon}
              Filtrar por
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
            <Menu.Items className="absolute left-0 z-10 mt-2 -mr-1 w-96 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="p-1">
                {filters.map((filter, idx) => (
                  <Disclosure key={idx}>
                    {({ open }) => (
                      <>
                        <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-100 px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75">
                          <span>{filter.filterType}</span>
                          <ChevronRightIcon
                            className={`${
                              open ? "rotate-90 transform" : ""
                            } h-5 w-5 text-gray-500`}
                          />
                        </Disclosure.Button>
                        <Disclosure.Panel className="grid grid-cols-2 gap-2 px-4 pt-4 pb-2 text-sm text-gray-500">
                          {filter.filterItems.map((item, idx) => (
                            <button key={idx} className={`border border-gray-400 rounded-full p-1 ${item.current ? "bg-gray-400 text-white" : ""} text-gray-500`} value={item.id} onClick={() => item.id === 0 ? item.action(null) : item.action(item.id)}>
                              {item.name}
                            </button>
                          ))}
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </>
  );
};

export default FiltersComponent;
