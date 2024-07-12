import React, { useState, Fragment, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";

import { X } from "heroicons-react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSpinner,
    faMinusCircle,
    faFilter,
    faWarehouse,
    faSortAmountUp,
    faSortAmountUpAlt,
} from "@fortawesome/free-solid-svg-icons";
import APIServer from "../../api/APIServices";
import * as moment from "moment";
import "moment/locale/es";
import CalendarEconomicCycle from "../../components/calendar/CalendarEconomicCycle";
import Loading from "../../components/misc/Loading";
import { Formik, Form, useField } from "formik";
import * as Yup from "yup";
import { useAppSelector } from "../../store/hooks";
import { selectUserSession } from "../../store/userSessionSlice";
import { useServer } from "../../hooks/useServer";
import InfiniteScroll from "react-infinite-scroller";
import { MyRadio } from "../../components/commos/MyRadio";
import { MyTextInput } from "../../components/commos/MyTextInput";
import { MyTextarea } from "../../components/commos/MyTextArea";
import {
    getOperationInventoryIcon,
    getOperationInventorySpanish,
} from "../../utils/functions";
import { getColorOperationInventoryType } from "../../utils/tailwindcss";

function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
}

export default function Inventory() {
    const navigate = useNavigate();
    const { business: myBusiness } = useAppSelector(state => state.init);

    const [selectedCE, setSelectedCE] = useState(null);
    const [showNote, setShowNote] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [allEconomicCycle, setAllEconomicCycle] = useState(null);
    const [reload, setReload] = useState(true);

    const [showAdminEC, setshowAdminEC] = useState(false);

    const [loadingMoreData, setLoadingMoreData] = useState(false);
    const [pageEC, setPageEC] = useState(1);
    const [totalPageEC, setTotalPageEC] = useState(1);
    const [showDate, setShowDate] = useState(false);

    const [orderBy, setOrderBy] = useState("createdAt");

    const {
        isLoading,
        inventories,
        findAllInventories,
        isLoadingList,
        endReached,
        loadMoreInventories,
    } = useServer({ startLoading: false });

    const getFilters = values => {
        let filters = {
            ...values,
        };

        if (orderBy) {
            filters.orderBy = orderBy;
        }

        return filters;
    };

    const loadMore = async page => {
        loadMoreInventories(getFilters(), page);
    };

    useEffect(() => {
        findAllInventories();
    }, [orderBy]);

    function showNoteMotion(index) {
        setSelectedCE(allEconomicCycle[index]);
        setShowNote(true);
    }

    const deleteMovements = () => {
        setLoading(true);

        APIServer.deleteAPI(`/administration/economiccycle/${selectedCE.id}`)
            .then(() => {
                setLoading(false);
                setShowModal(false);
                setReload(!reload);
            })
            .catch(() => {
                setLoading(false);
                toast.error("Error al eliminar");
            });
    };

    return (
        <>
            <header className="bg-white shadow">
                <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-en ">
                    <h1 className="lg:text-2xl sm:text-sm  mr-4 font-medium text-gray-900 ">
                        Inventarios
                    </h1>
                </div>
            </header>
            <main>
                <div className="max-w-2xl mx-auto py-3 px-4 sm:py-3 sm:px-6 lg:max-w-full lg:px-8">
                    {!isLoading && inventories.length === 0 && (
                        <div className="text-center mt-10">
                            <FontAwesomeIcon
                                icon={faWarehouse}
                                className="h-16 w-16 mt-3 text-gray-500 "
                                aria-hidden="true"
                            />
                            <h3 className="mt-2 text-sm font-medium text-gray-500">
                                No hay inventarios que mostrar
                            </h3>
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
                                Cargando...
                            </h3>
                        </div>
                    )}

                    {!isLoading && inventories.length !== 0 && (
                        <>
                            {/* <div className="flex justify-end m-5">
                {orderBy !== "createdAt" ? (
                  <button type="button" onClick={() => setOrderBy(null)}>
                    <FontAwesomeIcon
                      icon={faSortAmountUp}
                      className="h-6 w-6 text-slate-900"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <button type="button" onClick={() => setOrderBy("createdAt")}>
                    <FontAwesomeIcon
                      icon={faSortAmountUpAlt}
                      className="h-6 w-6 text-slate-900"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div> */}
                            <InfiniteScroll
                                pageStart={1}
                                loadMore={loadMore}
                                hasMore={!endReached}
                                loader={
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
                                }
                            >
                                <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                                    <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3"
                                                >
                                                    Cerrado por
                                                </th>

                                                <th
                                                    scope="col"
                                                    className="px-6 py-3"
                                                >
                                                    Fecha de Inicio
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3"
                                                >
                                                    Fecha de Cierre
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-2 py-3"
                                                >
                                                    Área
                                                </th>

                                                <th
                                                    scope="col"
                                                    className="px-6 py-3"
                                                >
                                                    <span className="sr-only"></span>
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {inventories.map((item, index) => {
                                                return (
                                                    <tr
                                                        className="bg-white border-b hover:bg-orange-50 dark:bg-gray-800 dark:border-gray-700"
                                                        key={index}
                                                    >
                                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                                            {
                                                                item.madeBy
                                                                    .displayName
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                                            {moment(
                                                                item
                                                                    .economicCycle
                                                                    .openDate
                                                            ).format("L") + " "}
                                                            {moment(
                                                                item
                                                                    .economicCycle
                                                                    .openDate
                                                            ).format("LT")}
                                                        </td>
                                                        <td className="px-2 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap ">
                                                            {item.economicCycle
                                                                .closedDate !==
                                                                null &&
                                                                moment(
                                                                    item
                                                                        .economicCycle
                                                                        .closedDate
                                                                ).format("L") +
                                                                    " "}
                                                            {item.economicCycle
                                                                .closedDate !==
                                                                null &&
                                                                moment(
                                                                    item
                                                                        .economicCycle
                                                                        .closedDate
                                                                ).format("LT")}
                                                            {item.economicCycle
                                                                .closedDate ===
                                                                null && (
                                                                <FontAwesomeIcon
                                                                    icon={
                                                                        faMinusCircle
                                                                    }
                                                                    className="text-gray-400 h-4"
                                                                />
                                                            )}
                                                        </td>

                                                        <th
                                                            scope="row"
                                                            className="px-6 py-4 font-medium text-gray-900 text-center dark:text-white whitespace-nowrap"
                                                        >
                                                            {item.area.name}
                                                        </th>

                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/reports/inventory/details/${item.id}`
                                                                    )
                                                                }
                                                                href="/area-stock"
                                                                className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                                            >
                                                                Ver más
                                                                <span aria-hidden="true">
                                                                    {" "}
                                                                    &rarr;
                                                                </span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </InfiniteScroll>
                        </>
                    )}
                </div>
                {showAdminEC && (
                    <Transition.Root show={showAdminEC} as={Fragment}>
                        <Dialog
                            as="div"
                            className="relative  z-40"
                            onClose={setshowAdminEC}
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
                                <div className="hidden fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity md:block" />
                            </Transition.Child>

                            <div className="fixed  z-40 inset-0 overflow-y-auto">
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
                                                    onClick={() =>
                                                        setshowAdminEC(false)
                                                    }
                                                >
                                                    <span className="sr-only">
                                                        Close
                                                    </span>
                                                    <X
                                                        className="h-6 w-6"
                                                        aria-hidden="true"
                                                    />
                                                </button>

                                                <div className="w-full grid grid-cols-1 gap-y-8 gap-x-4 items-center  sm:grid-cols-12 lg:gap-x-4">
                                                    <div className="sm:col-span-12 lg:col-span-12 items-center">
                                                        <h1 className=" text-xl font-medium text-gray-900 sm:mr-8">
                                                            Abrir Ciclo
                                                            Económico
                                                        </h1>

                                                        <Formik
                                                            initialValues={{
                                                                observations:
                                                                    "",
                                                                name: "",
                                                                priceSystemId: `${myBusiness.priceSystems[0].id}`,
                                                            }}
                                                            validationSchema={Yup.object(
                                                                {
                                                                    name: Yup.string(),
                                                                    observations:
                                                                        Yup.string(),
                                                                }
                                                            )}
                                                            onSubmit={values => {
                                                                let economicCyclyTem =
                                                                    {
                                                                        observations:
                                                                            values.observations,
                                                                        name: values.name,
                                                                        priceSystemId:
                                                                            parseInt(
                                                                                values.priceSystemId,
                                                                                10
                                                                            ),
                                                                    };

                                                                setLoading(
                                                                    true
                                                                );
                                                                APIServer.post(
                                                                    `/administration/economiccycle/open`,
                                                                    economicCyclyTem
                                                                )
                                                                    .then(
                                                                        () => {
                                                                            toast.success(
                                                                                "El ciclo económico se inicio satisfactoriamente"
                                                                            );
                                                                            setLoading(
                                                                                false
                                                                            );
                                                                            setshowAdminEC(
                                                                                false
                                                                            );
                                                                            setReload(
                                                                                !reload
                                                                            );
                                                                        }
                                                                    )
                                                                    .catch(
                                                                        () => {
                                                                            toast.error(
                                                                                "Error al iniciar el ciclo económico"
                                                                            );
                                                                            setLoading(
                                                                                false
                                                                            );
                                                                        }
                                                                    );
                                                            }}
                                                        >
                                                            {({ values }) => (
                                                                <Form>
                                                                    <div className="shadow sm:rounded-md sm:overflow-hidden mt-5">
                                                                        <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                                                                            <div className="grid grid-cols-6 gap-6">
                                                                                <div className="grid col-span-6 sm:col-span-6 ">
                                                                                    <label
                                                                                        htmlFor="last-name"
                                                                                        className="block text-sm font-medium text-gray-700 mb-1"
                                                                                    >
                                                                                        Seleccione
                                                                                        un
                                                                                        sistema
                                                                                        de
                                                                                        precio
                                                                                    </label>
                                                                                    <div className="grid grid-cols-3">
                                                                                        {myBusiness.priceSystems.map(
                                                                                            item => (
                                                                                                <div className="flex items-center mb-4">
                                                                                                    <MyRadio
                                                                                                        label={
                                                                                                            item.name
                                                                                                        }
                                                                                                        name="priceSystemId"
                                                                                                        type="radio"
                                                                                                        value={`${item.id}`}
                                                                                                    />
                                                                                                </div>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="grid grid-cols-6 gap-6">
                                                                                <div className="col-span-6 sm:col-span-6">
                                                                                    <MyTextInput
                                                                                        label="Nombre"
                                                                                        name="name"
                                                                                        type="text"
                                                                                        placeholder=""
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            <div className="grid grid-cols-6 gap-6">
                                                                                <div className="col-span-6 sm:col-span-6">
                                                                                    <MyTextarea
                                                                                        label="Agregar Observaciones"
                                                                                        name="observations"
                                                                                        type="text"
                                                                                        placeholder=" "
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                                                                                <button
                                                                                    type="submit"
                                                                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                                                                >
                                                                                    <span className="  inset-y-0 flex items-center mr-2">
                                                                                        {loading && (
                                                                                            <FontAwesomeIcon
                                                                                                icon={
                                                                                                    faSpinner
                                                                                                }
                                                                                                className="h-5 w-5 animate-spin text-white group-hover:text-gray-400"
                                                                                                aria-hidden="true"
                                                                                            />
                                                                                        )}
                                                                                    </span>
                                                                                    Abrir
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </Form>
                                                            )}
                                                        </Formik>
                                                    </div>
                                                </div>
                                            </div>
                                        </Dialog.Panel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition.Root>
                )}

                {showDate && (
                    <Transition.Root show={showDate} as={Fragment}>
                        <Dialog
                            as="div"
                            className="relative  z-40"
                            onClose={setShowDate}
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
                                <div className="hidden fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity md:block" />
                            </Transition.Child>

                            <div className="fixed  z-40 inset-0 overflow-y-auto">
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
                                        <Dialog.Panel className="flex text-base  transform transition w-full md:max-w-2xl md:px-4 md:my-8 lg:max-w-4xl">
                                            <div className="w-full relative flex  bg-white px-4 pt-10 pb-8 overflow-hidden shadow-2xl sm:px-6 sm:pt-5 md:p-6 lg:p-8">
                                                <button
                                                    type="button"
                                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 sm:top-8 sm:right-6 md:top-6 md:right-6 lg:top-8 lg:right-8"
                                                    onClick={() =>
                                                        setShowDate(false)
                                                    }
                                                >
                                                    <span className="sr-only">
                                                        Close
                                                    </span>
                                                    <X
                                                        className="h-6 w-6"
                                                        aria-hidden="true"
                                                    />
                                                </button>

                                                <CalendarEconomicCycle
                                                    setShowDate={setShowDate}
                                                />
                                            </div>
                                        </Dialog.Panel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition.Root>
                )}

                {showNote && (
                    <Transition.Root show={showNote} as={Fragment}>
                        <Dialog
                            as="div"
                            className="relative  z-40"
                            onClose={setShowNote}
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
                                <div className="hidden fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity md:block" />
                            </Transition.Child>

                            <div className="fixed  z-40 inset-0 overflow-y-auto">
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
                                                    onClick={() =>
                                                        setShowNote(false)
                                                    }
                                                >
                                                    <span className="sr-only">
                                                        Close
                                                    </span>
                                                    <X
                                                        className="h-6 w-6"
                                                        aria-hidden="true"
                                                    />
                                                </button>

                                                <div className="w-full">
                                                    <div className="sm:col-span-8 lg:col-span-8">
                                                        <h2 className="text-2xl font-extrabold text-gray-900 sm:pr-12">
                                                            Nota del Movimiento
                                                            :{" "}
                                                            {selectedCE &&
                                                                selectedCE.id}
                                                        </h2>
                                                        <p className="text-2xl text-gray-900">
                                                            {selectedCE &&
                                                                selectedCE.observations}
                                                        </p>
                                                        <p className="text-sm text-gray-900">
                                                            {selectedCE &&
                                                                moment(
                                                                    selectedCE.createdAt
                                                                ).format(
                                                                    "MMMM Do YYYY, h:mm:ss a"
                                                                )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Dialog.Panel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition.Root>
                )}
                {showModal && (
                    <div
                        className="relative  z-40"
                        aria-labelledby="modal-title"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity "></div>

                        <div className="fixed  z-40 inset-0 overflow-y-auto">
                            <div className="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
                                <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                                <svg
                                                    className="h-6 w-6 text-red-600"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth="2"
                                                    stroke="currentColor"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        strokeLinejoin="round"
                                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                                <h3
                                                    className="text-lg leading-6 font-medium text-gray-900"
                                                    id="modal-title"
                                                >
                                                    Atención
                                                </h3>
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-500">
                                                        Esta seguro que quieres
                                                        eliminar este ciclo
                                                        económico.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="button"
                                            onClick={deleteMovements}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            <span className="inset-y-0 flex items-center mr-2">
                                                {loading && (
                                                    <FontAwesomeIcon
                                                        icon={faSpinner}
                                                        className="h-5 w-5 animate-spin text-white group-hover:text-gray-400"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            Si, eliminar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
