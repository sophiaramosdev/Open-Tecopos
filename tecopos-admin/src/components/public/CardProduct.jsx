import React from "react";

export const CardProduct = ({ product, onClick, priceSystemId, cardWidth }) => {
    return (
        <>
            <div
                className={`h-80 ${cardWidth}   rounded-lg scrollbar-hide  overflow-hidden   shadow-md inline-block  cursor-pointer  ease-in-out duration-300`}
            >
                <div className="h-40  bg-slate-200 group-hover:opacity-75 ">
                    <img
                        src={
                            product.images.length > 0
                                ? product.images[0].src
                                : require("../../assets/png/Menu.png")
                        }
                        alt={product.name}
                        onClick={() => onClick(product)}
                        className="h-full w-full object-cover object-center sm:h-full sm:w-full"
                    />
                </div>
                {product.onSale && (
                    <div className="relative -mt-5 ml-2  z-40">
                        <span className="backdrop-blur-md backdrop-filter bg-opacity-60 inline-flex items-center rounded-full bg-rose-300 px-2.5 py-1 text-sm font-medium text-rose-700">
                            Oferta especial
                        </span>
                    </div>
                )}
                {product?.suggested && (
                    <div className="-mt-5 ml-2">
                        <span className="backdrop-blur-md backdrop-filter bg-opacity-60 inline-flex items-center rounded-full bg-yellow-300 px-2.5 py-1 text-sm font-medium text-yellow-700">
                            Recomendado
                        </span>
                    </div>
                )}
                <div className="flex flex-1 w-48 whitespace-nowrap  flex-col space-y-2 p-4">
                    <h3
                        className="text-xl truncate font-medium text-slate-900"
                        onClick={() => {}}
                    >
                        {product.name}
                    </h3>
                    <p className="text-sm truncate h-7 text-slate-500">
                        {" "}
                        {product.description}
                    </p>
                    <div className="flex flex-row flex-nowrap ">
                        {product.onSale && (
                            <h5
                                className={`text-base font-medium mr-2 text-slate-900 `}
                            >
                                {product.onSalePrice.amount +
                                    " " +
                                    product.onSalePrice.codeCurrency}
                            </h5>
                        )}
                        <h5
                            className={`text-base  font-medium  text-slate-900 ${
                                product.onSale && "line-through text-slate-500"
                            }`}
                        >
                            {product.prices.length === 1
                                ? product.prices[0].price +
                                  " " +
                                  product.prices[0].codeCurrency
                                : product.prices.map(
                                      item =>
                                          item.priceSystemId ===
                                              priceSystemId &&
                                          item.price + " " + item.codeCurrency
                                  )}
                        </h5>
                    </div>
                </div>
            </div>
        </>
    );
};
