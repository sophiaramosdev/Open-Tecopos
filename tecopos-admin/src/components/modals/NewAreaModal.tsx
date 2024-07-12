/*import React, { Fragment, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";
import APIServer from "../../api/APIServer";
import { newArea, updateArea } from "../../store/nomenclatorSlice";
import { MyTextInput } from "../commos/MyTextInput";
import { Dialog, Transition } from "@headlessui/react";
import { MySwitch } from "../commos/MySwitch";
import { AreasInterface } from "../../interfaces/ServerInterfaces";
import MyTextInput from "../commos/MyTextInput";

interface AreaModalProp{
  modalState:boolean
  closeModal:Function,
  areaType?:string,  
  area?:AreasInterface
}

export default function NewAreaModal({ areaType, modalState, closeModal, area }:AreaModalProp) {
  let textInfo = "";

  switch (areaType){
    case "SALE":
      textInfo = "Las áreas de tipo Punto de venta son aquellas que se encargan de gestionar las ventas del cara al cliente. Al crear un área de este tipo, se crea automáticamente un área de almacén asociada a ella, donde podrás tener el control de los recursos que allí se venden y sus movimientos.";
      break;

    case "STOCK":
      textInfo = "En las áreas de tipo almacén podrás tener el control de los recursos de tu inventario y sus movimientos.";
      break;

    default:
      textInfo = "Las áreas de tipo producción son aquellas donde ocurren procesos de que implican elaboración o confección de productos con mayor preparado, por ejemplo: la cocina, la parrillada, un taller, etc. De igual manera que el tipo anterior, al crear un área de producción, un almacén asociado a esta se creará automáicamente.";
      break;
  }

  /*const onSubmit = (values) => {
    setLoading(true);
    if (area) {
      APIServer.patch(`/administration/area/${area.id}`, {
        ...values,
        isActive: enabledArea,
      })
        .then((resp) => {
          setLoading(false);
          dispatch(updateArea(resp.data));
          setOpen(false);
          toast.success("Se ha editado el área correctamente.", 100);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
            toast.error(message, 6000);
          } else {
            toast.error(
              "Ha ocurrido un error mientras se editaba el área",
              6000
            );
          }
          setLoading(false);
        });
    } else {
      APIServer.post("/administration/area", values)
        .then((resp) => {
          setLoading(false);
          dispatch(newArea(resp.data));
          setOpen(false);
          toast.success("Se ha creado el área correctamente.", 100);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
            toast.error(message, 6000);
          } else {
            toast.error(
              "Ha ocurrido un error mientras se creaba el área",
              6000
            );
          }
          setLoading(false);
        });
    }
  };

  return (
    <>
      <Transition.Root show={true} as={Fragment}>
        <Dialog
          as="div"
          className="relative  z-40"
          onClose={()=>closeModal()}
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-7xl">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <main>
                          <div
                            className={`${
                              area ? "w-full" : "max-w-7xl"
                            } mx-auto py-6 sm:px-6 lg:px-8 flex-1`}
                          >
                            <div>
                              <div
                                className={`${
                                  area ? "md:grid-cols-1" : "md:grid-cols-3"
                                } md:grid  md:gap-6`}
                              >
                                {!area && (
                                  <div className="md:col-span-1">
                                    <div className="px-4 sm:px-0">
                                      <h3 className="text-lg font-medium leading-6 text-slate-900">
                                        Nueva área
                                      </h3>
                                      <p className="mt-1 text-sm text-slate-600">
                                        Crea un área para mayor organización de
                                        tu negocio, existen tres tipos de áreas:
                                        almacén, punto de venta y producción.
                                      </p>
                                      <p>{textInfo}</p>
                                    </div>
                                  </div>
                                )}
                                <div
                                  className={`${
                                    area ? "md:col-span-1" : "md:col-span-2"
                                  } mt-5 md:mt-0 `}
                                >
                                      <Form>
                                        <div className="shadow sm:rounded-md sm:overflow-hidden">
                                          <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
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

                                            {area && (
                                              <MySwitch
                                                value={enabledArea}
                                                onChange={setEnabledArea}
                                                label="Disponible"
                                                utilityLabel="font-medium"
                                                utilityContainer="mt-2 ml-5"
                                                utilityContainerGeneral="flex flex-row items-center "
                                              />
                                            )}

                                            <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
                                              <button
                                                type="button"
                                                className="mt-3 inline-flex mr-5 w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                                onClick={() => setOpen(false)}
                                                ref={cancelButtonRef}
                                              >
                                                Cancelar
                                              </button>
                                              <button
                                                type="submit"
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
                                                {area ? "Actualizar" : "Crear"}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </Form>
 
                                </div>
                              </div>
                            </div>
                          </div>
                        </main>
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
}*/

export default function NewAreaModal() {
  return <h1>kljklsda</h1>

}