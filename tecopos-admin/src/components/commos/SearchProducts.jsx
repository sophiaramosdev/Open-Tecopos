import {
  faBoxOpen,
  faFire,
  faLayerGroup,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog, RadioGroup, Transition } from "@headlessui/react";
import React, { Fragment } from "react";
import { useState } from "react";
import { useEffect } from "react";

import { useDebouncedValue } from "../../hooks/useDebounceValue";
import { useServer } from "../../hooks/useServer";
import {
  getMeasureSpanish,
  getProductTypeIcon,
  getTypeProductSpanish,
  printPrice,
} from "../../utils/functions";
import { getColorProductType } from "../../utils/tailwindcss";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SearchProducts({
  onSelectProduct,
  onClose,
  options = {},
}) {
  const { isLoading, products, findAllProducts } = useServer({
    startLoading: false,
  });

  const [valueSearch, setValueSearch] = useState("");
  const debouncedValue = useDebouncedValue(valueSearch, 700);

  useEffect(() => {
    if (debouncedValue.length > 2) {
      findAllProducts({
        search: debouncedValue,
        ...options,
      });
    }
  }, [debouncedValue]);

  const [selected, setSelected] = useState();

  const onClicHandler = () => {
    if (selected) {
      const product = products.find((item) => item.id === selected);
      onSelectProduct(product);
      onClose();
    }
  };

  return (
    <>
      <Transition.Root show={true} as={Fragment}>
        <Dialog as="div" className="relative  z-40" onClose={onClose}>
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

          <div className="fixed inset-0  z-40 overflow-y-auto">
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-2/4">
                  <div className="bg-white px-4 pt-2 h-96 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="w-full ">
                        <div className="shadow-sm mb-2">
                          <div className="flex relative inset-y-9 left-0 items-center ml-5 pointer-events-none ">
                            <svg
                              className="w-5 h-5 text-gray-500 dark:text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                stroke-linecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              ></path>
                            </svg>
                          </div>
                          <input
                            onChange={(e) => setValueSearch(e.target.value)}
                            type="search"
                            id="default-search"
                            className="block p-4 pl-10 w-full text-sm  text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                            placeholder="Introduzca un criterio de búsqueda... "
                          />
                        </div>

                        {!isLoading && products.length === 0 && (
                          <div className="text-center">
                            <FontAwesomeIcon
                              icon={faBoxOpen}
                              className="h-16 w-16 mt-3 text-gray-500 "
                              aria-hidden="true"
                            />
                            <h3 className="mt-2 text-sm font-medium text-gray-500">
                              No hay productos que mostrar
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Introduzca un criterio de búsqueda
                            </p>
                          </div>
                        )}

                        {isLoading && (
                          <div className="text-center mt-5">
                            <FontAwesomeIcon
                              icon={faSpinner}
                              className="h-10 w-10 animate-spin text-orange-500"
                              aria-hidden="true"
                            />
                            <h3 className="text-sm font-medium text-gray-500 mt-3">
                              Buscando...
                            </h3>
                          </div>
                        )}

                        {!isLoading && products.length !== 0 && (
                          <div className="overflow-y-scroll scroll h-64 mt-3 scroll-smooth scrollbar-hide">
                            <RadioGroup value={selected} onChange={setSelected}>
                              <RadioGroup.Label className="sr-only">
                                {" "}
                                Pricing plans{" "}
                              </RadioGroup.Label>
                              <div className="relative -space-y-px rounded-md bg-white">
                                {products.map((product, index) => (
                                  <RadioGroup.Option
                                    key={index}
                                    value={product.id}
                                    className={({ checked }) =>
                                      classNames(
                                        index === 0
                                          ? "rounded-tl-md rounded-tr-md"
                                          : "",
                                        index === products.length - 1
                                          ? "rounded-bl-md rounded-br-md"
                                          : "",
                                        checked
                                          ? "bg-indigo-50 border-indigo-200  z-40"
                                          : "border-gray-200",
                                        "relative border p-4 flex flex-col cursor-pointer md:pl-4 md:pr-6 md:grid md:grid-cols-4 focus:outline-none"
                                      )
                                    }
                                  >
                                    {({ active, checked }) => (
                                      <>
                                        <span className="flex items-center text-sm">
                                          <span
                                            className={classNames(
                                              checked
                                                ? "bg-indigo-600 border-transparent"
                                                : "bg-white border-gray-300",
                                              active
                                                ? "ring-2 ring-offset-2 ring-indigo-500"
                                                : "",
                                              "h-4 w-4 rounded-full border flex items-center justify-center"
                                            )}
                                            aria-hidden="true"
                                          >
                                            <span className="rounded-full bg-white w-1.5 h-1.5" />
                                          </span>
                                          <RadioGroup.Label
                                            as="span"
                                            className={classNames(
                                              checked
                                                ? "text-indigo-900"
                                                : "text-gray-900",
                                              "ml-3 font-medium"
                                            )}
                                          >
                                            {product.name}
                                          </RadioGroup.Label>
                                        </span>
                                        <RadioGroup.Description
                                          as="span"
                                          className={classNames(
                                            checked
                                              ? "text-indigo-700"
                                              : "text-gray-500",
                                            "ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-left"
                                          )}
                                        >
                                          <div
                                            className={classNames(
                                              getColorProductType(product.type),
                                              "inline-flex items-center ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0"
                                            )}
                                          >
                                            {product.type ===
                                              "READYFORSALE" && (
                                              <FontAwesomeIcon
                                                icon={
                                                  product.type === "MENU"
                                                    ? faFire
                                                    : faLayerGroup
                                                }
                                                className={
                                                  "text-green-500 mr-2 align-middle"
                                                }
                                              />
                                            )}
                                            <FontAwesomeIcon
                                              icon={getProductTypeIcon(
                                                product.type
                                              )}
                                              className={classNames(
                                                getColorProductType(
                                                  product.type
                                                ),
                                                "mr-2 align-middle"
                                              )}
                                            />
                                            {getTypeProductSpanish(
                                              product.type
                                            )}
                                          </div>
                                        </RadioGroup.Description>
                                        <RadioGroup.Description
                                          as="span"
                                          className="ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-center"
                                        >
                                          <span
                                            className={classNames(
                                              checked
                                                ? "text-indigo-900"
                                                : "text-gray-900",
                                              "font-medium"
                                            )}
                                          >
                                            ${printPrice(product.averageCost)}
                                          </span>
                                        </RadioGroup.Description>
                                        <RadioGroup.Description
                                          as="span"
                                          className={classNames(
                                            checked
                                              ? "text-indigo-700"
                                              : "text-gray-500",
                                            "ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-right"
                                          )}
                                        >
                                          {getMeasureSpanish(product.measure)}
                                        </RadioGroup.Description>
                                      </>
                                    )}
                                  </RadioGroup.Option>
                                ))}
                              </div>
                            </RadioGroup>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-orange-500 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={onClicHandler}
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={onClose}
                    >
                      Cancelar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
