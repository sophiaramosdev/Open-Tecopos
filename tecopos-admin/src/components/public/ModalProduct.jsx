import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function ModalProduct({ onClick, product }) {
    return (
        <Transition.Root show={true} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-40"
                onClose={() => onClick()}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-60"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-20"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 hidden backdrop-blur-md backdrop-filter bg-gray-500 bg-opacity-75 transition-opacity md:block" />
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
                                <div className="relative flex w-full items-center overflow-hidden bg-white px-4 pt-14 pb-8 shadow-2xl sm:px-6 sm:pt-8 md:p-6 lg:p-8">
                                    <button
                                        type="button"
                                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 sm:top-8 sm:right-6 md:top-6 md:right-6 lg:top-8 lg:right-8"
                                        onClick={() => onClick()}
                                    >
                                        <FontAwesomeIcon
                                            icon={faTimes}
                                            className="h-6 w-6"
                                            aria-hidden="true"
                                        />
                                    </button>

                                    <div className="grid w-full grid-cols-1 items-start gap-y-8 gap-x-6 sm:grid-cols-12 lg:gap-x-8">
                                        <div className="sm:col-span-4 lg:col-span-5">
                                            <div className="aspect-w-1 aspect-h-1 overflow-hidden rounded-lg bg-gray-100">
                                                <img
                                                    src={
                                                        product?.images
                                                            .length !==
                                                            undefined &&
                                                        product?.images.length >
                                                            0
                                                            ? product?.images[0]
                                                                  .src
                                                            : require("../../assets/png/Menu.png")
                                                    }
                                                    alt={product?.name}
                                                    className="object-cover object-center"
                                                />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-8 lg:col-span-7">
                                            <h2 className="text-2xl font-bold text-gray-900 sm:pr-12">
                                                {product?.name}
                                            </h2>

                                            <section
                                                aria-labelledby="information-heading"
                                                className="mt-3"
                                            >
                                                <div className="flex flex-row">
                                                    {product?.onSale && (
                                                        <p
                                                            className={`text-2xl mr-2 text-gray-900`}
                                                        >
                                                            {product.onSalePrice
                                                                .amount +
                                                                " " +
                                                                product
                                                                    .onSalePrice
                                                                    .codeCurrency}
                                                        </p>
                                                    )}
                                                    <p
                                                        className={` ${
                                                            product?.onSale
                                                                ? "line-through text-slate-500 text-lg mt-1"
                                                                : "text-gray-900 text-2xl"
                                                        }`}
                                                    >
                                                        {product?.prices[0]
                                                            .price +
                                                            " " +
                                                            product?.prices[0]
                                                                .codeCurrency}
                                                    </p>
                                                    {product?.onSale && (
                                                        <div className=" ml-2">
                                                            <span className="backdrop-blur-md backdrop-filter bg-opacity-60 inline-flex items-center rounded-full bg-rose-300 px-2.5 py-1 text-sm font-medium text-rose-700">
                                                                <svg
                                                                    className="-ml-0.5  animate-ping mr-1.5 h-2 w-2 text-rose-700"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 8 8"
                                                                >
                                                                    <circle
                                                                        cx={4}
                                                                        cy={4}
                                                                        r={3}
                                                                    />
                                                                </svg>
                                                                Oferta especial
                                                            </span>
                                                        </div>
                                                    )}
                                                    {product?.suggested && (
                                                        <div className=" ml-2">
                                                            <span className="backdrop-blur-md backdrop-filter bg-opacity-60 inline-flex items-center rounded-full bg-yellow-300 px-2.5 py-1 text-sm font-medium text-yellow-700">
                                                                <svg
                                                                    className="-ml-0.5  animate-ping mr-1.5 h-2 w-2 text-yellow-700"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 8 8"
                                                                >
                                                                    <circle
                                                                        cx={4}
                                                                        cy={4}
                                                                        r={3}
                                                                    />
                                                                </svg>
                                                                Recomendado
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Reviews */}
                                                {/* <div className="mt-3">
                        <h4 className="sr-only">Reviews</h4>
                        <div className="flex items-center">
                          <div className="flex items-center">
                            {[0, 1, 2, 3, 4].map((rating) => (
                              <StarIcon
                                key={rating}
                                className={classNames(
                                  product.rating > rating ? 'text-gray-400' : 'text-gray-200',
                                  'h-5 w-5 flex-shrink-0'
                                )}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                          <p className="sr-only">{product.rating} out of 5 stars</p>
                        </div>
                      </div> */}

                                                <div className="mt-6">
                                                    <h4 className="sr-only">
                                                        Description
                                                    </h4>

                                                    <p className="text-sm text-gray-700">
                                                        {product?.description}
                                                    </p>
                                                </div>
                                            </section>

                                            <section
                                                aria-labelledby="options-heading"
                                                className="mt-6"
                                            >
                                                <form>
                                                    {/* Colors */}
                                                    {/* <div>
                          <h4 className="text-sm text-gray-600">Color</h4>

                          <RadioGroup value={selectedColor} onChange={setSelectedColor} className="mt-2">
                            <RadioGroup.Label className="sr-only"> Choose a color </RadioGroup.Label>
                            <div className="flex items-center space-x-3">
                              {product.colors.map((color) => (
                                <RadioGroup.Option
                                  key={color.name}
                                  value={color}
                                  className={({ active, checked }) =>
                                    classNames(
                                      color.selectedColor,
                                      active && checked ? 'ring ring-offset-1' : '',
                                      !active && checked ? 'ring-2' : '',
                                      '-m-0.5 relative p-0.5 rounded-full flex items-center justify-center cursor-pointer focus:outline-none'
                                    )
                                  }
                                >
                                  <RadioGroup.Label as="span" className="sr-only">
                                    {' '}
                                    {color.name}{' '}
                                  </RadioGroup.Label>
                                  <span
                                    aria-hidden="true"
                                    className={classNames(
                                      color.bgColor,
                                      'h-8 w-8 border border-black border-opacity-10 rounded-full'
                                    )}
                                  />
                                </RadioGroup.Option>
                              ))}
                            </div>
                          </RadioGroup>
                        </div> */}

                                                    {/* <div className="mt-6">
                          <button
                            type="submit"
                            className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-8 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                          >
                            Añadir al carrito
                          </button>
                        </div> */}
                                                </form>
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
    );
}
