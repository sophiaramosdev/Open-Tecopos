import { Fragment, useCallback, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ImageDetails(props) {
  const {
    onClose,
    selectImageIndex,
    setImagesUrl,
    imagesUrl,
    selectedImages,
    setSelectedImages,
  } = props;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onDropImages = useCallback(async (acceptedFile) => {
    const file = acceptedFile[0];
    if (file) {
      const data = new FormData();
      data.append("file", file);
      const urlImage = URL.createObjectURL(file);
      let seletedsImagesTemp = selectedImages;
      let imagesUrlTemp = imagesUrl;

      imagesUrlTemp[selectImageIndex] = urlImage;
      seletedsImagesTemp[selectImageIndex] = data;

      setImagesUrl(imagesUrlTemp);
      setSelectedImages(seletedsImagesTemp);
    } else {
      toast.info("El tamaño de la imagen es mayor que 200KB");
    }
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: "image/jpeg, image/png",
    maxSize: 400000,
    noKeyboard: true,
    multiple: false,
    onDrop: onDropImages,
  });

  return (
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="h-6 w-6"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div className="sm:flex sm:items-start m-5">
                  <div
                    {...getRootProps()}
                    className={classNames(
                      "group block w-full aspect-w-10 aspect-h-7 rounded-lg  overflow-hidden"
                    )}
                  >
                    <input {...getInputProps()} />
                    <img
                      src={imagesUrl[selectImageIndex]}
                      alt=""
                      className={classNames("object-cover pointer-events-none")}
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={onClose}
                  >
                    Eliminar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
