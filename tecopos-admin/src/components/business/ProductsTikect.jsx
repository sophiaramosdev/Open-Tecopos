import {
  faBoxOpen,
  faFire,
  faLayerGroup,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { RadioGroup } from "@headlessui/react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
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

export default function ProductsTikect({ addCart }) {
  const { isLoading, products, findAllProducts, error } = useServer({
    startLoading: false,
  });

  const [valueSearch, setValueSearch] = useState("");
  const debouncedValue = useDebouncedValue(valueSearch, 700);
  const [selectedProduct, setSelectedProduct] = useState();

  const makeASearch = (value) => {
    if (debouncedValue.length > 2) {
      findAllProducts({
        search: value ? value : debouncedValue,
        stockType: "READYFORSALE",
      });
    }
  };

  useEffect(() => {
    makeASearch();
  }, [debouncedValue]);

  //Managing error toasts
  useEffect(() => {
    toast.error(error);
  }, [error]);

  return (
    <div className="bg-white px-4 min-h-full pb-4">
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
            </svg>
          </div>
          <input
            onChange={(e) => setValueSearch(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && e.preventDefault()}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                makeASearch(debouncedValue);
              }
            }}
            type="search"
            id="default-search"
            className="block p-4 pl-10 w-full text-sm  text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
            placeholder="Introduzca un criterio de búsqueda... "
          />
        </div>

        {!isLoading && products.length === 0 && valueSearch === "" && (
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

        {!isLoading && products.length === 0 && valueSearch !== "" && (
          <div className="text-center">
            <FontAwesomeIcon
              icon={faBoxOpen}
              className="h-16 w-16 mt-3 text-gray-500 "
              aria-hidden="true"
            />
            <h3 className="mt-2 text-sm font-medium text-gray-500">
              No se encontró ninguna coincidencia en esta área
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Introduzca otro criterio de búsqueda
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
          <div className=" mt-3 ">
            <RadioGroup value={selectedProduct} onChange={setSelectedProduct}>
              <div className="relative -space-y-px rounded-md bg-white">
                {products.map((item, index) => {
                  const product = item;

                  return (
                    <RadioGroup.Option
                      key={product.id}
                      value={product}
                      className={({ checked }) =>
                        classNames(
                          index === 0 ? "rounded-tl-md rounded-tr-md" : "",
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
                                  checked ? "text-indigo-900" : "text-gray-900",
                                  "ml-3 font-medium"
                                )}
                              >
                                {product.name}
                              </RadioGroup.Label>
                            </span>

                          <RadioGroup.Description
                            as="span"
                            className={classNames(
                              checked ? "text-indigo-700" : "text-gray-500",
                              "ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-right"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => addCart(product)}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                            >
                              Seleccionar
                            </button>
                          </RadioGroup.Description>
                        </>
                      )}
                    </RadioGroup.Option>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
</div>
);
}