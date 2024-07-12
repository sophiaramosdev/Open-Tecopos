import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog, Transition } from "@headlessui/react";

import React, { Fragment, useRef } from "react";
import { useState } from "react";

import { Form, Formik } from "formik";
import * as Yup from "yup";
import APIServer from "../../api/APIServices";
import { toast } from "react-toastify";
import { MyTextInput } from "../commos/MyTextInput";
import { MySwitch } from "../commos/MySwitch";
import { updateBusiness } from "../../store/slices/initSlice";
import { useAppSelector, useAppDispatch } from "../../store/hooks";

export default function Currency(props) {
  const { onClose, currency, mainCurrency } = props;
  const formikRef = useRef();
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(currency ? currency.isActive : true);
  const {business} = useAppSelector(state=>state.init);

  const dispatch = useAppDispatch();

  const onSubmit = async () => {
    setLoading(true);
    const values = formikRef.current.values;
    let currencyTemp = { ...values, isActive };

    APIServer.patch(`/administration/currency/${currency.id}`, currencyTemp)
      .then((resp) => {
        const availableCurrencies = business.availableCurrencies.map((item) => {
          if (resp.data.id === item.id) {
            return {
              ...item,
              exchangeRate: resp.data.exchangeRate,
              isActive: resp.data.isActive,
            };
          } else return item;
        });
        dispatch(updateBusiness({ availableCurrencies }));
        setLoading(false);
        toast.success("La moneda  del negocio se actualizo correctamenta");
        onClose();
      })
      .catch(() => {
        setLoading(false);
        toast.error("Error al actualizar la moneda del negocio");
      });
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
            <div className="hidden fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity md:block" />
          </Transition.Child>

          <div className="fixed  z-40 inset-0 overflow-y-auto">
            <div className="flex items-stretch md:items-center justify-center  text-center md:px-2 lg:px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
                enterTo="opacity-100 translate-y-0 md:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 md:scale-100"
                leaveTo="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
              >
                <Dialog.Panel className="flex text-base text-left transform transition w-full md:max-w-2xl md:px-4 md:my-8 lg:max-w-6xl">
                  <div className="w-full relative flex items-center bg-white px-4 pt-14 pb-8 overflow-hidden shadow-2xl sm:px-6 sm:pt-8 md:p-6 lg:p-8">
                    <h1 className="text-2xl  text-gray-500 font-medium absolute top-3 ">
                      {currency.name}
                    </h1>
                    <div className="w-full p-5">
                      <Formik
                        innerRef={formikRef}
                        initialValues={{
                          isActive,
                          exchangeRate: currency ? currency.exchangeRate : "",
                        }}
                        validationSchema={Yup.object({
                          name: Yup.string()
                            .min(2, "El Nombre debe tener almenos 2 cartactres")
                            .required("El Nombre del recurso es obligatorio"),
                        })}
                        onSubmit={onSubmit}
                      >
                        {({}) => (
                          <Form>
                            <div className="shadow sm:rounded-md sm:overflow-hidden">
                              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                                <div className="hidden sm:block">
                                  <div className="grid grid-cols-6 gap-6">
                                    <div className="col-span-6 sm:col-span-6">
                                      <MyTextInput
                                        label={`Valor de tasa de cambio en: ${mainCurrency} `}
                                        name="exchangeRate"
                                        type="number"
                                        placeholder=""
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-6 gap-6 mt-5">
                                    <div className="col-span-6 sm:col-span-3">
                                      <MySwitch
                                        value={isActive}
                                        onChange={() => setIsActive(!isActive)}
                                        label="Activa"
                                        utilityLabel="font-medium text-lg text-slate-700"
                                        utilityContainer="mt-2 ml-5"
                                        utilityContainerGeneral="flex flex-row items-center"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
                                  <button
                                    type="button"
                                    className="mt-3 inline-flex mr-5 w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                    onClick={onClose}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    onClick={onSubmit}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                  >
                                    {loading && (
                                      <span className="  inset-y-0 flex items-center mr-2">
                                        <FontAwesomeIcon
                                          icon={faSpinner}
                                          className="h-5 w-5 animate-spin text-white group-hover:text-orange-400"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    )}
                                    {currency ? "Actualizar" : "Crear"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </Form>
                        )}
                      </Formik>
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
