import React, { Fragment, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxes,
  faFilter,
  faClock,
  faFireAlt,
  faPlay,
  faBalanceScaleLeft,
  faArrowDown,
  faArrowUp,
  faBan,
  faFileExport,
  faSignInAlt,
  faDollyBox,
  faSignOutAlt,
  faDiagramProject,
  faCashRegister,
  faSpinner,
  faMinusSquare,
} from "@fortawesome/free-solid-svg-icons";

import { Dialog, Transition, Disclosure } from "@headlessui/react";

import { X, MinusSmOutline, PlusSmOutline } from "heroicons-react";
import * as moment from "moment";
import "moment/locale/es";
import { toast } from "react-toastify";
import { useField } from "formik";
import APIServer from "../../api/APIServices";
import Loading from "../../components/misc/Loading";
import { useAppSelector } from "../../store/hooks";
import { selectNomenclator } from "../../store/nomenclatorSlice";
import { getMeasureSpanish } from "../../utils/functions";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function HistoricalInventoryDetailsPage() {
  const navigate = useNavigate();
  const { id, areaName } = useParams();
  const { areas } = useAppSelector((state) => state.init);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);

  return (
    <>
      <header className="bg-white shadow">
        <div className=" mx-auto py-6 px-4 sm:px-3 lg:px-8 flex justify-between">
          <div className="mr-2">
            <h1 className="lg:text-2xl sm:text-sm font-medium text-gray-900">
              <div
                type="button"
                onClick={() => navigate(`/reports/historical/inventory`)}
                className="hover:text-blue-500 lg:text-2xl sm:text-sm font-medium text-gray-900"
              >
                Detalles de Inventarios
              </div>
            </h1>
          </div>
          {/* <button onClick={() => setMobileFiltersOpen(true)}>
            <FontAwesomeIcon
              icon={faFilter}
              className="text-gray-900 h-6 m-4"
            />
          </button> */}
        </div>
      </header>
      <div className="max-w-2xl mx-auto py-3 px-4 sm:py-3 sm:px-3 lg:max-w-7xl lg:px-8">
        <main>
          <>
            <Inventory
              selectedArea={selectedArea}
              setMobileFiltersOpen={setMobileFiltersOpen}
              id={id}
            />
            {/* {selectedArea !== null ? (
              <Inventory
                selectedArea={selectedArea}
                setMobileFiltersOpen={setMobileFiltersOpen}
                id={id}
              />
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg flex justify-center">
                <FontAwesomeIcon
                  icon={faBoxes}
                  className="text-gray-900 opacity-30 h-56 p-20"
                />
              </div>
            )} */}
            {/* <Transition.Root show={mobileFiltersOpen} as={Fragment}>
              <Dialog
                as="div"
                className="fixed inset-0 flex z-40 "
                onClose={setMobileFiltersOpen}
              >
                <Transition.Child
                  as={Fragment}
                  enter="transition-opacity ease-linear duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="transition-opacity ease-linear duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>
                <Transition.Child
                  as={Fragment}
                  enter="transition ease-in-out duration-300 transform"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transition ease-in-out duration-300 transform"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <div className="ml-auto relative max-w-xs w-full h-full bg-white shadow-xl py-4 pb-12 flex flex-col overflow-y-auto">
                    <div className="px-4 flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">
                        Filtros
                      </h2>
                      <button
                        type="button"
                        className="-mr-2 w-10 h-10 bg-white p-2 rounded-md flex items-center justify-center text-gray-400"
                        onClick={() => setMobileFiltersOpen(false)}
                      >
                        <X className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                
                    <form className="mt-4 border-t border-gray-200">
                      <Disclosure
                        as="div"
                        className="border-t border-gray-200 px-4 py-6"
                      >
                        {({ open }) => (
                          <>
                            <h3 className="-mx-2 -my-3 flow-root">
                              <Disclosure.Button className="px-2 py-3 bg-white w-full flex items-center justify-between text-gray-400 hover:text-gray-500">
                                <span className="font-medium text-gray-900">
                                  Mis Almacenes
                                </span>
                                <span className="ml-6 flex items-center">
                                  {open ? (
                                    <MinusSmOutline
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <PlusSmOutline
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                              </Disclosure.Button>
                            </h3>
                            <Disclosure.Panel className="pt-6">
                              <div className="space-y-6">
                                <div
                                  onClick={() => setSelectedArea(null)}
                                  className={
                                    selectedArea === null
                                      ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                      : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faBoxes}
                                    className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                    aria-hidden="true"
                                  />
                                  <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                    Todos
                                  </label>
                                </div>
                              </div>
                            </Disclosure.Panel>
                            {areas
                              .filter((item) => item.type === "STOCK")
                              .map((item, index) => (
                                <>
                                  <Disclosure.Panel
                                    className="pt-6"
                                    key={index}
                                  >
                                    <div className="space-y-6">
                                      <div
                                        onClick={() => setSelectedArea(item)}
                                        className={
                                          selectedArea !== null &&
                                          selectedArea.name === item.name
                                            ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                            : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                        }
                                      >
                                        <FontAwesomeIcon
                                          icon={faBoxes}
                                          className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                          aria-hidden="true"
                                        />
                                        <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                          {item.name}
                                        </label>
                                      </div>
                                    </div>
                                  </Disclosure.Panel>
                                </>
                              ))}
                          </>
                        )}
                      </Disclosure>
                    </form>
                  </div>
                </Transition.Child>
              </Dialog>
            </Transition.Root> */}
          </>
        </main>
      </div>
    </>
  );
}

function Inventory(props) {
  const { id } = props;

  const [ipv, setIpv] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listProducts, setListProducts] = useState([]);

  useEffect(() => {
    (() => {
      setIsLoading(true);

      APIServer.get(`/administration/ipv-historical/${id}`)
        .then((resp) => {
          setIpv(resp.data);

          if (resp.data.products) {
            let store_sections = [];
            resp.data.products.forEach((item) => {
              //Find  if  category exist
              const found = store_sections.find(
                (section) => section.id === item.productCategoryId
              );

              if (found) {
                store_sections = store_sections.map((item_data) => {
                  if (item_data.id === item.productCategoryId) {
                    return {
                      ...item_data,
                      data: [...item_data.data, item],
                    };
                  }
                  return item_data;
                });
              } else {
                store_sections.push({
                  id: item.productCategoryId,
                  title: item.productCategory,
                  data: [item],
                });
              }
            });

            store_sections = store_sections.sort((a, b) => {
              return a.title.toUpperCase() > b.title.toUpperCase() ? 1 : -1;
            });

            setListProducts(store_sections);
          }

          setIsLoading(false);
        })
        .catch(() => {
          toast.error("Error al obtener el inventario");
          setIsLoading(false);
        });
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center mt-5">
        <FontAwesomeIcon
          icon={faSpinner}
          className="h-10 w-10 animate-spin text-orange-500"
          aria-hidden="true"
        />
        <h3 className="text-sm font-medium text-gray-500 mt-3">
          Cargando ineventario...
        </h3>
      </div>
    );
  }

  return (
    <>
      <div className="px-4  sm:px-6  mt-5">
        <div className="sm:flex ml-2 sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-slate-900">
              {" "}
              Cerrado por :{" "}
              {ipv.openAction?.madeBy !== null
                ? ipv.openAction?.madeBy + " "
                : " "}
              {ipv.openAction?.madeAt !== null
                ? moment(ipv.openAction?.madeAt).format("lll")
                : " "}
            </h1>
            <p className="mt-2 text-sm text-slate-700">{ipv.observations}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 ">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-white">
                    <tr>
                      <th
                        colSpan={1}
                        scope="colgroup"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900"
                      ></th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faBalanceScaleLeft}
                          className="text-slate-900 h-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faPlay}
                          className="text-slate-900 h-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faSignInAlt}
                          className="text-slate-900 h-4"
                        />
                      </th>

                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faDollyBox}
                          className="text-slate-900 h-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faSignOutAlt}
                          className="text-slate-900 h-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faMinusSquare}
                          className="text-slate-900 h-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faDiagramProject}
                          className="text-slate-900 h-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faCashRegister}
                          className="text-slate-900 h-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900"
                      >
                        <FontAwesomeIcon
                          icon={faBoxes}
                          className="text-slate-900 h-4"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {listProducts.map((item) => (
                      <Fragment key={item.title}>
                        <tr className="border-t border-slate-200">
                          <th
                            colSpan={10}
                            scope="colgroup"
                            className="bg-slate-50 px-2 py-2 text-left text-sm font-semibold text-slate-900 sm:px-6"
                          >
                            {item.title}
                          </th>
                        </tr>
                        {item.data.map((product, productIdx) => (
                          <tr
                            key={product.name}
                            className={classNames(
                              productIdx === 0
                                ? "border-slate-300"
                                : "border-slate-200",
                              product.inStock < 0 && "bg-rose-200",
                              "border-t hover:bg-orange-50 "
                            )}
                          >
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-left text-slate-500">
                              {product.name}
                            </td>
                            <td className="whitespace-nowrap  text-center  px-3 py-4 text-sm text-slate-500">
                              {getMeasureSpanish(product.measure)}
                            </td>
                            <td className="whitespace-nowrap  text-center  px-3 py-4 text-sm text-slate-500">
                              {product.initial}
                            </td>
                            <td className="whitespace-nowrap text-center  px-3 py-4 text-sm text-slate-500">
                              {product.entry !== 0 && product.entry}
                            </td>
                            <td className="whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500">
                              {product.movements !== 0 && product.movements}
                            </td>
                            <td className="whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500">
                              {product.outs !== 0 && product.outs}
                            </td>
                            <td className="whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500">
                              {product.waste !== 0 && product.waste}
                            </td>
                            <td className="whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500">
                              {product.processed !== 0 && product.processed}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-center text-sm text-slate-500">
                              {product.sales !== 0 && product.sales}
                            </td>
                            <td className="whitespace-nowrap    font-extrabold px-3 py-4 text-sm text-slate-600">
                              {product.inStock}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
