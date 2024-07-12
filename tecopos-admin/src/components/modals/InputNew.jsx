import React, {
  Fragment,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlusCircle,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faToggleOff,
  faToggleOn,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from "react-router-dom";
import { Dialog, Transition, Menu, Disclosure } from "@headlessui/react";
import { X, MinusSmOutline, PlusSmOutline, Login } from "heroicons-react";
import { XIcon } from "@heroicons/react/outline";
import { Formik, Form, useField } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import APIServer from "../../api/APIServices";

import Loading from "../misc/Loading";

import { useSelector } from "react-redux";
import { selectUserSession } from "../../store/userSessionSlice";
import { selectNomenclator } from "../../store/nomenclatorSlice";
import { MyTextInputCurrency } from "../commos/MyTextInputCurrency";
import { MySelectCurrency } from "../commos/MySelectCurrency";
import { MyTextInput } from "../commos/MyTextInput";
import { MyTextarea } from "../commos/MyTextArea";
import { MySelect } from "../commos/MySelect";
import { MyCheckbox } from "../commos/MyCheckbox";
import { getMeasureSpanish } from "../../utils/functions";
import { useServer } from "../../hooks/useServer";
import { useAppSelector } from "../../store/hooks";

export default function InputNew() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { areas } = useAppSelector((state) => state.init);

  const selectedArea = areas.find((item) => item.id === Number(id));

  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [listProducts, setListProducts] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [listCategorys, setListCategorys] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");

  const [idCategoryProduct, setIdCategoryProduct] = useState(null);

  const [type, setType] = useState(null);
  const [hasAddons, setHasAddons] = useState(null);
  const [isAddon, setIsAddon] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loadingMoreData, setLoadingMoreData] = useState(false);
  const [pageProduct, setPageProduct] = useState(1);
  const [totalPageProduct, setTotalPageProduct] = useState(1);

  const [reload, setReload] = useState(true);

  const { business: myBusiness } = useAppSelector((state) => state.init);
  const codeCurrency = myBusiness.availableCurrencies.find(
    (item) => item.isMain
  )?.code;

  const { isLoading, products, findAllProducts, endReached, loadMoreProducts } =
    useServer({ startLoading: false });

  const observer = useRef();

  const lastProduct = useCallback(
    (node) => {
      if (totalPageProduct === pageProduct) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMoreData(true);
          let temPage = pageProduct + 1;

          APIServer.get(
            `/administration/product?type=STOCK&page=${temPage}${
              hasAddons !== null ? `&showForSale=${hasAddons}` : ``
            }${isAddon !== null ? `&isAddon=${isAddon}` : ``}${
              idCategoryProduct !== null
                ? `&productCategoryId=${idCategoryProduct}`
                : ``
            }${searchProduct !== null ? `&search=${searchProduct}` : ``}`
          )
            .then((product) => {
              setPageProduct(pageProduct + 1);
              setListProducts([...listProducts, ...product.data.items]);
              setLoadingMoreData(false);
            })
            .catch(() => {
              setLoadingMoreData(false);

              toast.error("Error al obtener más productos");
            });
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMoreData]
  );

  useEffect(() => {
    (async () => {
      setLoadingMoreData(true);
      Promise.all([
        APIServer.get(
          `/administration/product?type=STOCK${
            hasAddons !== null ? `&showForSale=${hasAddons}` : ``
          }${isAddon !== null ? `&isAddon=${isAddon}` : ``}${
            idCategoryProduct !== null
              ? `&productCategoryId=${idCategoryProduct}`
              : ``
          }${searchProduct !== null ? `&search=${searchProduct}` : ``}`
        ),
        APIServer.get(`/administration/productcategory`),
      ])
        .then((resp) => {
          setLoadingMoreData(false);
          setListCategorys(resp[1].data.items);
          setPageProduct(1);
          setTotalPageProduct(resp[0].data.totalPages);
          setListProducts(resp[0].data.items);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
            toast.error(message);
          } else {
            toast.error(
              "Ha ocurrido un error mientras se cargaban los detalles"
            );
          }

          setLoadingMoreData(false);
        });
    })();
  }, [type, hasAddons, isAddon, idCategoryProduct, searchProduct, reload]);

  const slideLeft = () => {
    var slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft - 500;
  };

  const slideRight = () => {
    var slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft + 500;
  };

  return (
    <>
      {listProducts === null || myBusiness === null ? (
        <Loading />
      ) : (
        <>
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between ">
              <h1 className="lg:text-2xl sm:text-sm  mr-4 font-medium text-gray-900 ">
                <button
                  type="button"
                  onClick={() => navigate(`/areas/list/${selectedArea.type}`)}
                  className="hover:text-blue-500 lg:text-2xl sm:text-sm font-medium text-gray-900"
                >
                  Mis Áreas/
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/areas/details/${id}`)}
                  className="hover:text-blue-500 lg:text-2xl sm:text-sm font-medium text-gray-900"
                >
                  {selectedArea.name}/
                </button>
                Nueva Entrda
              </h1>
            </div>
          </header>
          <main>
            <div className="max-w-2xl mx-auto py-3 px-4 sm:py-3 sm:px-6 lg:max-w-7xl lg:px-8">
              <div className="flex items-center m-4">
                <button onClick={() => setMobileFiltersOpen(true)}>
                  <FontAwesomeIcon
                    icon={faFilter}
                    className="text-gray-900 h-6 mr-10"
                  />
                </button>
                <div className="w-full shadow-sm">
                  <div className="flex relative inset-y-9 left-0 items-center ml-5 pointer-events-none">
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
                    onChange={(e) => setSearchProduct(e.target.value)}
                    type="search"
                    id="default-search"
                    className="block p-4 pl-10 w-full text-sm  text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                    placeholder="Quesos, Jamón, vinos..."
                  />
                </div>
              </div>

              {loadingProducts ? (
                <>
                  <div className="flex flex-wrap  h-44 overflow-x-auto m-5">
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-16 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-28 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-12 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-20 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-18 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-16 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-28 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-12 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-20 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-18 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-16 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-28 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-12 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-20 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-18 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-16 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-28 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-12 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-20 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-18 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-20 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-18 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-24 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-16 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-28 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                    <div className="flex items-center p-3 border-2 h-10 w-12 animate-pulse rounded-full bg-gray-300 border-gray-300 m-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-8 mt-5">
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />

                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />

                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                    <div className="animate-pulse w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden xl:aspect-w-7 xl:aspect-h-8 shadow-md" />
                  </div>
                </>
              ) : (
                <>
                  {listProducts.length === 0 ? (
                    <>
                      {loadingCategory ? (
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                              <th scope="col" className="px-6 py-3">
                                Nombre
                              </th>
                              <th scope="col" className="px-6 py-3">
                                Costo Promedio
                              </th>

                              <th scope="col" className="px-6 py-3">
                                Medida
                              </th>

                              <th scope="col" className="px-6 py-3">
                                <span className="sr-only"></span>
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr className="bg-slate-200 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-300 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-200 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-300 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-200 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-300 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <>
                          {listCategorys.length === 0 ? (
                            <></>
                          ) : (
                            <div className="relative flex items-center scrollbar-hide ">
                              <FontAwesomeIcon
                                icon={faChevronLeft}
                                className="opacity-50 cursor-pointer hover:opacity-100"
                                onClick={slideLeft}
                                size="lg"
                              />
                              <div
                                id="slider"
                                className="w-full h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide"
                              >
                                <button
                                  className={`${
                                    idCategoryProduct !== null
                                      ? "items-center  border-2 h-10 rounded-full  border-gray-300 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                      : "items-center border-2 h-10 rounded-full bg-gray-600 text-white  border-gray-900 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                  }`}
                                  type="button"
                                  onClick={() => {
                                    setIdCategoryProduct(null);
                                  }}
                                >
                                  Todos
                                </button>

                                {listCategorys.map((item, index) => (
                                  <button
                                    key={index}
                                    className={`${
                                      idCategoryProduct !== item.id
                                        ? "items-center  border-2 h-10 rounded-full  border-gray-300 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                        : "items-center border-2 h-10 rounded-full bg-gray-600 text-white  border-gray-900 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                    }`}
                                    type="button"
                                    onClick={() => {
                                      setIdCategoryProduct(item.id);
                                    }}
                                  >
                                    {item.name}
                                  </button>
                                ))}
                              </div>
                              <FontAwesomeIcon
                                icon={faChevronRight}
                                className="opacity-50 cursor-pointer hover:opacity-100"
                                onClick={slideRight}
                                size="lg"
                              />
                            </div>
                          )}
                        </>
                      )}

                      <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-5 flex justify-center">
                        <FontAwesomeIcon
                          icon={faPlusCircle}
                          className="text-gray-900 opacity-30 h-56 p-20"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {loadingCategory ? (
                        <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
                          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                              <th scope="col" className="px-6 py-3">
                                Nombre
                              </th>
                              <th scope="col" className="px-6 py-3">
                                Costo Promedio
                              </th>

                              <th scope="col" className="px-6 py-3">
                                Medida
                              </th>

                              <th scope="col" className="px-6 py-3">
                                <span className="sr-only"></span>
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr className="bg-slate-200 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-300 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-200 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-300 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-200 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                            <tr className="bg-slate-300 border-b dark:bg-gray-800 dark:border-gray-700 animate-pulse">
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <th
                                scope="row"
                                className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                              ></th>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                              <td className="px-6 py-4 text-right"></td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <>
                          {listCategorys.length === 0 ? (
                            <></>
                          ) : (
                            <div className="relative flex items-center scrollbar-hide">
                              <FontAwesomeIcon
                                icon={faChevronLeft}
                                className="opacity-50 cursor-pointer hover:opacity-100"
                                onClick={slideLeft}
                                size="lg"
                              />
                              <div
                                id="slider"
                                className="w-full h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide"
                              >
                                <button
                                  className={`${
                                    idCategoryProduct !== null
                                      ? "items-center  border-2 h-10 rounded-full  border-gray-300 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                      : "items-center border-2 h-10 rounded-full bg-gray-600 text-white  border-gray-900 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                  }`}
                                  type="button"
                                  onClick={() => {
                                    setIdCategoryProduct(null);
                                  }}
                                >
                                  Todos
                                </button>

                                {listCategorys.map((item, index) => (
                                  <button
                                    key={index}
                                    className={`${
                                      idCategoryProduct !== item.id
                                        ? "items-center  border-2 h-10 rounded-full  border-gray-300 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                        : "items-center border-2 h-10 rounded-full bg-gray-600 text-white  border-gray-900 m-1 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300"
                                    }`}
                                    type="button"
                                    onClick={() => {
                                      setIdCategoryProduct(item.id);
                                    }}
                                  >
                                    {item.name}
                                  </button>
                                ))}
                              </div>
                              <FontAwesomeIcon
                                icon={faChevronRight}
                                className="opacity-50 cursor-pointer hover:opacity-100"
                                onClick={slideRight}
                                size="lg"
                              />
                            </div>
                          )}
                        </>
                      )}

                      <div className="bg-white">
                        <div className=" py-3 sm:py-3   ">
                          <h2 className="sr-only">Productos</h2>

                          <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-5 mb-10">
                            <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
                              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                  <th
                                    scope="col"
                                    className="text-left px-6 py-3"
                                  >
                                    Nombre
                                  </th>
                                  <th scope="col" className="px-6 py-3">
                                    Costo Promedio
                                  </th>

                                  <th scope="col" className="px-6 py-3">
                                    Medida
                                  </th>

                                  <th scope="col" className="px-6 py-3"></th>
                                  <th scope="col" className="px-6 py-3"></th>
                                  <th scope="col" className="px-6 py-3"></th>
                                  <th scope="col" className="px-6 py-3"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {listProducts.map((product, index) => {
                                  if (listProducts.length === index + 1) {
                                    return (
                                      <tr
                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                        key={index}
                                        ref={lastProduct}
                                      >
                                        <th
                                          scope="row"
                                          className="px-6 py-4 text-left font-medium text-gray-900 dark:text-white whitespace-nowrap"
                                        >
                                          {index + 1}-{product.name}
                                        </th>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                          {product.averageCost &&
                                            product.averageCost.toFixed(2) +
                                              " " +
                                              myBusiness.costCurrency}
                                        </td>

                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                          {getMeasureSpanish(product.measure)}
                                        </td>

                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                          <button
                                            onClick={() => {
                                              setSelectedProduct(product);
                                              setShowModal(true);
                                            }}
                                            type="button"
                                            className="lg:mt-1 sm:mt-0 hover:text-blue-500    text-sm font-medium text-gray-900"
                                          >
                                            <Login
                                              className="text-gray-700 h-6"
                                              aria-hidden="true"
                                            />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  } else {
                                    return (
                                      <tr
                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                        key={index}
                                      >
                                        <th
                                          scope="row"
                                          className="px-6 py-4 text-left font-medium text-gray-900 dark:text-white whitespace-nowrap"
                                        >
                                          {index + 1}-{product.name}
                                        </th>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                          {product.averageCost &&
                                            product.averageCost +
                                              " " +
                                              myBusiness.costCurrency}
                                        </td>

                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                          {getMeasureSpanish(product.measure)}
                                        </td>

                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap "></td>

                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                          <button
                                            onClick={() => {
                                              setSelectedProduct(product);
                                              setShowModal(true);
                                            }}
                                            type="button"
                                            className="lg:mt-1 sm:mt-0 hover:text-blue-500    text-sm font-medium text-gray-900"
                                          >
                                            <Login
                                              className="text-gray-700 h-6"
                                              aria-hidden="true"
                                            />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  }
                                })}
                              </tbody>
                            </table>
                          </div>
                          {loadingMoreData && (
                            <div className="mb-10  sm:mt-5  min-h-full flex items-center justify-center px-8 sm:px-6 lg:px-15">
                              <div className="items-center justify-center mt-5 ">
                                <svg
                                  className="animate-spin h-10 w-10 "
                                  viewBox="0 0 24 24"
                                >
                                  <FontAwesomeIcon
                                    icon={faSpinner}
                                    className="h-5 w-5 text-orange-500"
                                    aria-hidden="true"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <Transition.Root show={mobileFiltersOpen} as={Fragment}>
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

                    {/* Filters */}
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
                                  Disponible para la venta
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
                                  onClick={() => setHasAddons(null)}
                                  className={
                                    hasAddons === null
                                      ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                      : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faPlusCircle}
                                    className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                    aria-hidden="true"
                                  />

                                  <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                    Todos
                                  </label>
                                </div>
                              </div>
                            </Disclosure.Panel>

                            <Disclosure.Panel className="pt-6">
                              <div className="space-y-6">
                                <div
                                  onClick={() => setHasAddons(true)}
                                  className={
                                    hasAddons
                                      ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                      : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faPlusCircle}
                                    className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                    aria-hidden="true"
                                  />

                                  <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                    Disponible
                                  </label>
                                </div>
                              </div>
                            </Disclosure.Panel>
                            <Disclosure.Panel className="pt-6">
                              <div className="space-y-6">
                                <div
                                  onClick={() => setHasAddons(false)}
                                  className={
                                    hasAddons === false
                                      ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                      : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faPlusCircle}
                                    className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                    aria-hidden="true"
                                  />

                                  <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                    No Disponible
                                  </label>
                                </div>
                              </div>
                            </Disclosure.Panel>
                          </>
                        )}
                      </Disclosure>
                      <Disclosure
                        as="div"
                        className="border-t border-gray-200 px-4 py-6"
                      >
                        {({ open }) => (
                          <>
                            <h3 className="-mx-2 -my-3 flow-root">
                              <Disclosure.Button className="px-2 py-3 bg-white w-full flex items-center justify-between text-gray-400 hover:text-gray-500">
                                <span className="font-medium text-gray-900">
                                  Agrego
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
                                  onClick={() => setIsAddon(null)}
                                  className={
                                    isAddon === null
                                      ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                      : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faPlusCircle}
                                    className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                    aria-hidden="true"
                                  />

                                  <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                    Todos
                                  </label>
                                </div>
                              </div>
                            </Disclosure.Panel>
                            <Disclosure.Panel className="pt-6">
                              <div className="space-y-6">
                                <div
                                  onClick={() => setIsAddon(true)}
                                  className={
                                    isAddon
                                      ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                      : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faPlusCircle}
                                    className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                    aria-hidden="true"
                                  />

                                  <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                    Es un Agrego
                                  </label>
                                </div>
                              </div>
                            </Disclosure.Panel>
                            <Disclosure.Panel className="pt-6">
                              <div className="space-y-6">
                                <div
                                  onClick={() => setIsAddon(false)}
                                  className={
                                    isAddon === false
                                      ? "bg-orange-400 border-solid flex flex-row sm:rounded-lg p-1 hover:bg-gray-400"
                                      : "bg-gray-50 border-solid flex flex-row  p-1 hover:bg-gray-400 sm:rounded-lg"
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faPlusCircle}
                                    className="block h-5 w-5  text-gray-900 mt-1 ml-2"
                                    aria-hidden="true"
                                  />

                                  <label className="mt-1 max-w-2xl text-sm  text-gray-900 ml-2">
                                    No es un Agrego
                                  </label>
                                </div>
                              </div>
                            </Disclosure.Panel>
                          </>
                        )}
                      </Disclosure>
                    </form>
                  </div>
                </Transition.Child>
              </Dialog>
            </Transition.Root>
            {showModal && (
              <ProductModal
                navigate={navigate}
                name={selectedArea.name}
                id={id}
                showModal={showModal}
                setShowModal={setShowModal}
                selectedProduct={selectedProduct}
                myBusiness={myBusiness}
                codeCurrency={codeCurrency}
              />
            )}
          </main>
        </>
      )}
    </>
  );
}

function ProductModal(props) {
  const {
    showModal,
    setShowModal,
    selectedProduct,
    myBusiness,
    name,
    id,
    navigate,
    codeCurrency,
  } = props;
  const [formData, setFormData] = useState(initialFormValue());
  const [loading, setLoading] = useState(false);
  const [listSupplier, setlistSupplier] = useState([]);
  const [reload, setReload] = useState(false);
  const [loadingSupplier, setLoadingSupplier] = useState(false);

  useEffect(() => {
    (() => {
      APIServer.get("/administration/supplier")
        .then((supplier) => {
          setlistSupplier(supplier.data.items);
        })
        .catch(() => {
          toast.error("Error al obtener los proveedores");
        });
    })();
  }, [reload]);

  const onSubmit = (e) => {
    e.preventDefault();
    setLoadingSupplier(true);
    APIServer.post("/administration/supplier", formData)
      .then(() => {
        setReload(!reload);
        toast.success("El proveedor se creo correctamente");
        setLoadingSupplier(false);
      })
      .catch(() => {
        toast.error("Error al crear el proveedor");
        setLoadingSupplier(false);
      });
  };

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <Transition.Root show={showModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setShowModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="hidden fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity md:block" />
          </Transition.Child>

          <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-stretch md:items-center justify-center min-h-full text-center md:px-2 lg:px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
                enterTo="opacity-100 translate-y-0 md:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 md:scale-100"
                leaveTo="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
              >
                <Dialog.Panel className="flex text-base text-left transform transition w-full md:max-w-2xl md:px-4 md:my-8 lg:max-w-4xl">
                  <div className="w-full relative flex items-center bg-white px-4 pt-14 pb-8 overflow-hidden shadow-2xl sm:px-6 sm:pt-8 md:p-6 lg:p-8">
                    <button
                      type="button"
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 sm:top-8 sm:right-6 md:top-6 md:right-6 lg:top-8 lg:right-8"
                      onClick={() => setShowModal(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    <div className="w-full grid grid-cols-1 gap-y-8 gap-x-4 items-start sm:grid-cols-12 lg:gap-x-4">
                      <div className="aspect-w-2 aspect-h-3 rounded-lg bg-gray-100 overflow-hidden sm:col-span-4 lg:col-span-5">
                        <img
                          src={
                            selectedProduct.images.length !== 0
                              ? `${selectedProduct.images[0]?.src}`
                              : require(`../../assets/png/stock-product-default.png`)
                          }
                          alt={selectedProduct.name}
                          className="object-center object-cover"
                        />
                      </div>
                      <div className="sm:col-span-8 lg:col-span-7">
                        <h2 className="text-lg font-extrabold text-gray-900 sm:pr-12">
                          Realizar entrada de: {selectedProduct.name}
                        </h2>

                        <section
                          aria-labelledby="information-heading"
                          className="mt-2"
                        >
                          <p className="text-lg text-gray-900">
                            {selectedProduct.description}
                          </p>
                          <p className="text-lg text-gray-900 mt-2 font-medium">
                            Costo Promedio:{" "}
                            {selectedProduct?.averageCost &&
                              selectedProduct?.averageCost +
                                " " +
                                myBusiness.mainCurrency}
                          </p>
                        </section>

                        <section
                          aria-labelledby="options-heading"
                          className="mt-3"
                        >
                          <Formik
                            initialValues={{
                              quantity: "",
                              supplierId: null,
                              description: "",
                              newSupplier: "",
                              availableCurrencies: codeCurrency,
                              price: "",
                            }}
                            validationSchema={Yup.object({
                              price: Yup.number().required(
                                "El precio de compra es obligatorio"
                              ),
                              quantity: Yup.number().required(
                                "La cantidad a entrar es obligatorio"
                              ),
                            })}
                            onSubmit={(values) => {
                              let movementsEntry = {
                                productId: selectedProduct.id,
                                price: {
                                  amount: values.price,
                                  codeCurrency: values.availableCurrencies,
                                },
                                quantity: values.quantity,
                                description: values.description,
                                supplierId: values.supplierId,
                                stockAreaId: id,
                              };

                              setLoading(true);
                              APIServer.post(
                                "/administration/movement/entry",
                                movementsEntry
                              )
                                .then(() => {
                                  setLoading(false);
                                  toast.success(
                                    "La entra de realizo satisfactoriamente"
                                  );
                                  setShowModal(false);
                                  navigate(`/areas/details/${id}`);
                                })
                                .catch((error) => {
                                  const message = error.response.data.message;
                                  if (message) {
                                    toast.error(message);
                                  } else {
                                    toast.error(
                                      "Ha ocurrido un error mientras se hacia una nueva entrada"
                                    );
                                  }
                                  setLoading(false);
                                });
                            }}
                          >
                            {({ values, setValues }) => (
                              <Form>
                                <div className="shadow sm:rounded-md sm:overflow-hidden">
                                  <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                                    <div className="grid grid-cols-6 gap-6">
                                      <div className="col-span-6 sm:col-span-6">
                                        <MyTextInput
                                          label={`Cantidad a entrar en ${getMeasureSpanish(
                                            selectedProduct.measure
                                          )}`}
                                          name="quantity"
                                          type="number"
                                          placeholder=""
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-6 gap-6">
                                      <div className="col-span-6 sm:col-span-6">
                                        <label
                                          htmlFor="price"
                                          className="block text-sm font-medium text-gray-700"
                                        >
                                          {`Precio total de compra `}
                                        </label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                          <MyTextInputCurrency
                                            name="price"
                                            type="number"
                                          />
                                          <MySelectCurrency name="availableCurrencies">
                                            <option selected>Monedas</option>
                                            {myBusiness.availableCurrencies.map(
                                              (item) => (
                                                <option value={item.code}>
                                                  {item.code}
                                                </option>
                                              )
                                            )}
                                          </MySelectCurrency>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-6 gap-6">
                                      <div className="col-span-6 sm:col-span-6">
                                        <MyTextarea
                                          label="Agregue una Nota de su entrada"
                                          name="description"
                                          type="text"
                                          placeholder=" "
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-6 gap-6">
                                      <div className="col-span-6 sm:col-span-6">
                                        <MySelect
                                          label="Proveedores"
                                          name="supplierId"
                                        >
                                          <option selected>
                                            Seleccione un Proveedor
                                          </option>
                                          {listSupplier.map((item) => (
                                            <option value={item.id}>
                                              {item.name}
                                            </option>
                                          ))}
                                        </MySelect>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-6 gap-6">
                                      <div className="col-span-6 sm:col-span-6">
                                        <MyCheckbox
                                          name="newSupplier"
                                          value="NewSupplier"
                                        >
                                          Añadir un nuevo proveedor
                                        </MyCheckbox>
                                      </div>
                                    </div>

                                    {values.newSupplier[0] ===
                                      "NewSupplier" && (
                                      <div className="grid grid-cols-6 gap-6">
                                        <div className="col-span-6 sm:col-span-6">
                                          <label
                                            htmlFor="company-website"
                                            className="block text-sm font-medium text-gray-700"
                                          >
                                            Cree
                                          </label>

                                          <div className="relative mt-1 w-full shadow-sm">
                                            <input
                                              type="text"
                                              id="name"
                                              name="name"
                                              defaultValue={formData.name}
                                              onChange={(e) => onChange(e)}
                                              className="block p-4 pl-3 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                                              placeholder=""
                                            />
                                            <button
                                              type="button"
                                              onClick={onSubmit}
                                              className="text-white absolute right-2.5 bottom-2.5 bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
                                            >
                                              <span className="mr-2">
                                                {loadingSupplier && (
                                                  <FontAwesomeIcon
                                                    icon={faSpinner}
                                                    className="h-5 w-5 animate-spin text-white group-hover:text-gray-400"
                                                    aria-hidden="true"
                                                  />
                                                )}
                                              </span>
                                              Añadir Proveedor
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                                      <button
                                        type="submit"
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                      >
                                        <span className="  inset-y-0 flex items-center mr-2">
                                          {loading && (
                                            <FontAwesomeIcon
                                              icon={faSpinner}
                                              className="h-5 w-5 animate-spin text-white group-hover:text-gray-400"
                                              aria-hidden="true"
                                            />
                                          )}
                                        </span>
                                        Realizar Entrada
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </Form>
                            )}
                          </Formik>
                        </section>
                      </div>
                    </div>
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

function initialFormValue() {
  return {
    name: "",
  };
}
