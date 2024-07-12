import { faSpinner, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog, Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/outline";
import React, { Fragment, useCallback, useEffect, useRef } from "react";
import { useState } from "react";

import { Form, Formik } from "formik";
import * as Yup from "yup";
import APIServer from "../../api/APIServices";
import { toast } from "react-toastify";
import { MyTextInput } from "../commos/MyTextInput";
import { MySwitch } from "../commos/MySwitch";
import { useDropzone } from "react-dropzone";
import { MyTextarea } from "../commos/MyTextArea";
import APIMediaServer from "../../api/APIMediaServer";

import { imageAcepted } from "../../utils/dummy";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Categorys(props) {
  const { onClose, setReload, reload, category } = props;

  const formikRef = useRef();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageProductUrl, setImageProductUrl] = useState(
    category?.images ? `${category.image.src}` : null
  );

  const [showModalDelete, setShowModalDelete] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    const values = formikRef.current.values;
    let categoryTemp = values;

    if (selectedFile) {
      const response = await APIMediaServer.post("/files", selectedFile);
      categoryTemp = {
        ...categoryTemp,
        imageId: response.data[0].id,
      };
    }

    if (category) {
      APIServer.patch(
        `/administration/productcategory/${category.id}`,
        categoryTemp
      )
        .then(() => {
          setLoading(false);
          toast.success("La categoría se actualizó correctamente");
          onClose();
          setReload(!reload);
        })
        .catch(() => {
          setLoading(false);
          toast.error("Error al actualizar la categoría");
        });
    } else {
      APIServer.post(`/administration/productcategory`, categoryTemp)
        .then(() => {
          setLoading(false);
          onClose();
          toast.success("La categoría se creó correctamente");
          setReload(!reload);
        })
        .catch(() => {
          setLoading(false);
          toast.error("Error al crear la categoría");
        });
    }
  };

  const deleteCategory = () => {
    setLoading(true);

    APIServer.deleteAPI(`/administration/productcategory/${category.id}`)
      .then(() => {
        setLoading(false);
        setReload(!reload);
        onClose();
        toast.success("La categoría se eliminó correctamente");
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          toast.error(message);
        } else {
          toast.error("Ha ocurrido un error mientras se eliminaba el recurso");
        }
        setLoading(false);
      });
  };
  const onDropImageProduct = useCallback(async (acceptedFile) => {
    const file = acceptedFile[0];
    if (file) {
      const data = new FormData();
      data.append("file", file);
      setImageProductUrl(URL.createObjectURL(file));
      setSelectedFile(data);
    } else {
      toast.info("El tamaño de la imagen es mayor que 200KB");
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    imageAcepted,
    maxSize: 200000,
    noKeyboard: true,
    multiple: false,
    onDrop: onDropImageProduct,
  });

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
            <div className="flex items-stretch md:items-center justify-center text-center md:px-2 lg:px-4">
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
                    {showModalDelete && (
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
                                        Esta seguro que quieres eliminar el
                                        recurso: {category.name}{" "}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                  type="button"
                                  onClick={deleteCategory}
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
                                  onClick={() => setShowModalDelete(false)}
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
                    <h1 className="text-2xl  text-gray-500 font-medium absolute top-3 ">
                      {category
                        ? `Editar: ${category.name}`
                        : "Nueva categoría"}
                    </h1>
                    <div className="w-full p-5">
                      {category && (
                        <div
                          className="flex text-lg font-medium mb-3 text-slate-900 justify-end "
                          aria-hidden="true"
                        >
                          <button
                            onClick={() => setShowModalDelete(true)}
                            type="button"
                            className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          >
                            <FontAwesomeIcon
                              icon={faTrashAlt}
                              className="-ml-1 mr-2 h-5 w-5"
                              aria-hidden="true"
                            />
                            Eliminar
                          </button>
                        </div>
                      )}

                      <Formik
                        innerRef={formikRef}
                        initialValues={{
                          name: category ? category.name : "",
                          description: category ? category.description : "",
                        }}
                        validationSchema={Yup.object({
                          name: Yup.string()
                            .min(2, "El Nombre debe tener almenos 2 cartactres")
                            .required("El Nombre del recurso es obligatorio"),
                        })}
                      >
                        {({ values }) => (
                          <Form>
                            <div className="shadow sm:rounded-md sm:overflow-hidden">
                              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                                <div className="hidden sm:block">
                                  <div className="grid grid-cols-6 gap-6 ">
                                    <div
                                      className="col-span-6 sm:col-span-6 flex justify-center"
                                      {...getRootProps()}
                                    >
                                      <input {...getInputProps()} />

                                      <img
                                        className="h-28 w-28 rounded-full "
                                        src={
                                          imageProductUrl
                                            ? imageProductUrl
                                            : require("../../assets/png/categoryDefault.png")
                                        }
                                        alt="Avatar"
                                      />
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
                                  <div className="grid grid-cols-6 gap-6 mt-3">
                                    <div className="col-span-6 sm:col-span-6">
                                      <MyTextarea
                                        label="Descripción"
                                        name="description"
                                        type="text"
                                        placeholder=""
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
                                    type="button"
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
                                    {category ? "Actualizar" : "Crear"}
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