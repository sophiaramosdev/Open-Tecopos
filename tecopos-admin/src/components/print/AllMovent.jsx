import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faMinusCircle } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import * as moment from "moment";
import "moment/locale/es";
import { useSelector } from "react-redux";
import { selectUserSession } from "../../store/userSessionSlice";
import { useAppSelector } from "../../store/hooks";

export default function AllMovent(props) {
  const { allMovents, name, nameproduct, quantity, measure } = props;

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Reporte de Movientos en ${name} del producto: ${nameproduct}`,
    onAfterPrint: () => toast.success("Impresión exitosa"),
  });
  const { user } = useAppSelector((state) => state.init);

  return (
    <>
      <div
        ref={componentRef}
        style={{ width: "100%" }}
        className="max-w-full mx-auto py-3 px-4 sm:py-3 sm:px-2 lg:max-w-full lg:px-8"
      >
        <div className="flex justify-between mx-1">
          <h1 className="text-lg font-medium text-gray-900 my-2">
            Últimas Operaciones en {name} {nameproduct && "de: " + nameproduct}{" "}
            : {allMovents.length}
          </h1>
          {measure && (
            <h1 className="text-lg font-medium text-gray-900 my-2">
              Total en existencia:{" "}
              {quantity + " " + (measure === "UNIT" ? "Unidad(s)" : measure)}
            </h1>
          )}
        </div>

        <div className="relative overflow-x-auto shadow  sm:rounded-lg">
          <table className="w-full text-sm text-center text-gray-500 dark:text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-2 py-3 text-left">
                  Codigo
                </th>
                <th scope="col" className="px-2 py-3">
                  Operación
                </th>

                <th scope="col" className="px-2 py-3">
                  Cantidad
                </th>

                <th scope="col" className="px-2 py-3">
                  Precio de Compra
                </th>
                <th scope="col" className="px-2 py-3">
                  Fecha
                </th>
                <th scope="col" className="px-2 py-3">
                  Usuario
                </th>
                <th scope="col" className="px-2 py-3">
                  Proveedor
                </th>
                <th scope="col" className="px-2 py-3">
                  Movido a
                </th>
                <th scope="col" className="px-2 py-3">
                  Nota
                </th>

                <th scope="col" className="px-2 py-3">
                  <span className="sr-only"></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {allMovents &&
                allMovents.map((items, index) => (
                  <tr
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                    key={index}
                  >
                    <td className="px-2 py-2 font-sm text-left text-gray-900 dark:text-white whitespace-nowrap">
                      {items.id}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-nowrap ">
                      {items.operation === "ENTRY" ? "Entrada" : "Movimiento"}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-nowrap ">
                      {items.quantity + " "}
                      {measure === "UNIT" ? "(U)" : measure}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-nowrap ">
                      {items.prices.length > 0 ? (
                        items.prices.map((item, index) => {
                          return (
                            item.price.toFixed(2) + " " + item.codeCurrency
                          );
                        })
                      ) : (
                        <FontAwesomeIcon
                          icon={faMinusCircle}
                          className="text-gray-400 h-4"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-nowrap ">
                      {moment(items.createdAt).format("L") + " "}
                      {moment(items.createdAt).format("LT")}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-nowrap ">
                      {items.movedBy !== null ? (
                        items.movedBy.displayName
                      ) : (
                        <FontAwesomeIcon
                          icon={faMinusCircle}
                          className="text-gray-400 h-4"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-nowrap ">
                      {items.supplier !== null ? (
                        items.supplier.name
                      ) : (
                        <FontAwesomeIcon
                          icon={faMinusCircle}
                          className="text-gray-400 h-4"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-nowrap ">
                      {items.movedTo !== null ? (
                        items.movedTo.name
                      ) : (
                        <FontAwesomeIcon
                          icon={faMinusCircle}
                          className="text-gray-400 h-4"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 font-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {items.description !== "" ? (
                        items.description
                      ) : (
                        <FontAwesomeIcon
                          icon={faMinusCircle}
                          className="text-gray-400 h-4"
                        />
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between mt-12">
          <p className="overline"> {user.displayName}</p>
          <p className="">{moment().format("MMMM Do YYYY, h:mm:ss a")}</p>
        </div>
      </div>

      <button onClick={handlePrint}>
        <FontAwesomeIcon
          icon={faPrint}
          className="text-gray-900 h-6 left-5 top-5 absolute"
        />
      </button>
    </>
  );
}
