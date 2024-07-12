import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  faChevronLeft,
  faChevronRight,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function ModalGallery({ onClick, images, index }) {
  const [currentSlide, setCurrentSlide] = useState(index);

  const slideLeft = () => {
    if (currentSlide !== 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slideRight = () => {
    if (images && currentSlide < images?.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative  z-40" onClose={() => onClick()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-60"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-20"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0  bg-gray-500 backdrop-blur-md backdrop-filter  bg-opacity-75 transition-opacity md:block" />
        </Transition.Child>

        <div className="fixed inset-0  z-40 overflow-y-auto">
          <div className="flex min-h-full items-stretch justify-center text-center md:items-center md:px-2 lg:px-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
              enterTo="opacity-100 translate-y-0 md:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 md:scale-100"
              leaveTo="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
            >
              <Dialog.Panel className="flex w-full transform text-left text-base transition md:my-8 md:max-w-2xl md:px-4 lg:max-w-4xl">
                <div className="relative flex w-full items-center overflow-hidden  px-4 pt-14 pb-8  sm:px-6 sm:pt-8 md:p-6 lg:p-8">
                  <button
                    type="button"
                    className="absolute top-4 right-4 text-white hover:text-white sm:top-8 sm:right-6 md:top-6 md:right-6 lg:top-8 lg:right-8"
                    onClick={() => onClick()}
                  >
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="h-6 w-6"
                      aria-hidden="true"
                    />
                  </button>
                  <div className="flex mt-10 items-center justify-between">
                    {currentSlide !== 0 && (
                      <FontAwesomeIcon
                        icon={faChevronLeft}
                        className="opacity-50 mx-2 text-white  cursor-pointer hover:opacity-100 "
                        onClick={slideLeft}
                        size={"2x"}
                      />
                    )}
                    <div className="max-w-full h-96 flex overflow-hidden relative">
                      {images &&
                        images.map((image, i) => {
                          return (
                            <img
                              src={image.src}
                              alt={`${image.id}`}
                              key={i}
                              className={
                                i === currentSlide
                                  ? " w-full h-full  object-cover"
                                  : "hidden"
                              }
                            />
                          );
                        })}
                    </div>
                    {images && currentSlide < images?.length - 1 && (
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className="opacity-50 mx-2 text-white cursor-pointer hover:opacity-100"
                        onClick={slideRight}
                        size={"2x"}
                      />
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
