import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReceipt, faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import * as moment from "moment";
import "moment/locale/es";
import { useSelector } from "react-redux";
import { selectUserSession } from "../../store/userSessionSlice";
import { printPrice } from "../../utils/functions";
import { useAppSelector } from "../../store/hooks";

export default function OrdensPrint(props) {
  const { cartShopping, widthPrinter } = props;
  const [totalPaymet, setTotalPaymet] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [imageProductUrl, setImageProductUrl] = useState(null);

  const layout = widthPrinter === 48 ? "200px" : "320px";
  const numberLines = widthPrinter === 48 ? 20 : 30;

  const coverWithCaracter = (caracter, factor = 1) => {
    let text = "";
    for (let index = 0; index < numberLines * factor; index++) {
      text += caracter;
    }
    return text;
  };

  const {business} = useAppSelector(state=>state.init);

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <>
      <div className="flex items-center justify-between px-4 mt-8 mb-5 sm:px-6 lg:px-8">
        <h2 className="text-lg font-medium text-gray-900">
          Comprobante de compra
        </h2>
      </div>

      {cartShopping.length === 0 ? (
        <div className="text-center">
          <FontAwesomeIcon
            icon={faReceipt}
            className="h-16 w-16 mt-3 text-gray-500 "
            aria-hidden="true"
          />
          <h3 className="mt-2 text-sm font-medium text-gray-500">
            No tienes productos en tu tique.
          </h3>
        </div>
      ) : (
        <div className=" mx-5">
          <div ref={componentRef} style={{ width: layout }}>
            <div className=" ">
              <p className="  font-medium mt-2 underline mb-3 underline-offset-8 text-center">
                {business.name}
              </p>
              <table className=" divide-y  ">
                <tbody>
                  <tr>
                    <td className={`  text-sm  `}>
                      <div className="font-medium">08/11/2022 7:35am</div>
                    </td>

                    <td
                      className={`py-1  pr-4 font-medium    text-right text-sm    `}
                    >
                      #8-Mesa 4
                    </td>
                  </tr>
                  <tr className="text-center">
                    <td className="text-sm " colSpan={2}>
                      {coverWithCaracter("=")}
                    </td>
                  </tr>
                  {cartShopping.map((product, index) => (
                    <>
                      <tr>
                        <td className={`  text-sm  `}>
                          <div className="font-medium  ">
                            {"(x" + product.quantity + ")" + " " + product.name}
                          </div>
                        </td>

                        <td
                          className={`py-1  pr-4 font-medium    text-right text-sm    `}
                        >
                          {printPrice(product?.price.price)}
                        </td>
                      </tr>
                    </>
                  ))}
                  <tr className="text-center">
                    <td className="text-sm" colSpan={2}>
                      {coverWithCaracter("-", 1.5)}
                    </td>
                  </tr>
                  <tr className="mt-2  ">
                    <td className="py-1 pt-2  text-sm ">
                      <div className="font-medium uppercase ">Importe:</div>
                    </td>

                    <td className="py-1  pr-4 text-right text-sm font-medium   ">
                      4585.00 CUP
                    </td>
                  </tr>
                  <tr className="mt-1 ">
                    <td className="  text-sm ">
                      <div className="font-medium  uppercase ">Subtotal:</div>
                    </td>

                    <td className="  pr-4 text-right text-sm font-medium   ">
                      4585.00 CUP
                    </td>
                  </tr>
                  <tr className="mt-1 ">
                    <td className="   text-sm ">
                      <div className="font-medium uppercase ">Descuento:</div>
                    </td>

                    <td className="  pr-4 text-right text-sm font-medium   ">
                      0.00 CUP
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="  font-medium mt-2 text-center">
                {business.footerTicket}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full rounded-md border border-transparent bg-orange-500 py-3 px-4 text-base font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-50"
            >
              Imprimir
            </button>
          </div>
        </div>
      )}
    </>
  );
}
