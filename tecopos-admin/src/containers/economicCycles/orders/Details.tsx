import { Fragment, useEffect, useState } from "react";
import {
  ExchangeRatesInterface,
  OrderInterface,
} from "../../../interfaces/ServerInterfaces";
import {
  BanknotesIcon,
  ClockIcon,
  CreditCardIcon,
  HomeModernIcon,
  ReceiptPercentIcon,
  TruckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import moment from "moment";
import { getStatusOrderSpanish } from "../../../utils/functions";
import { getColorStatusOrder } from "../../../utils/tailwindcss";
import {
  formatCalendar,
  formatCurrency,
  generatePdf,
  printPdf,
} from "../../../utils/helpers";
import { useAppSelector } from "../../../store/hooks";
import { FaPrint, FaRegFilePdf } from "react-icons/fa";
import MultipleActBtn, {
  BtnActions,
} from "../../../components/misc/MultipleActBtn";
import { FaMoneyBillWave } from "react-icons/fa6";
import Modal from "../../../components/misc/GenericModal";
import OrderReportPdf from "../../../reports/OrderReportPdf";
import PaymentContainer from "../../store/orders/PaymentContainer";
import { Tooltip as ReactTooltip } from "react-tooltip";
import useServer from "../../../api/useServerMain";
import BillingReportPdf from "../../../reports/BillingReportPDF";

interface Detail {
  item: OrderInterface | null;
  updateOrderState: (order: OrderInterface) => void;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const Details = ({ item, updateOrderState }: Detail) => {
  const { business } = useAppSelector((state) => state.init);
  const [paymentModal, setPaymentModal] = useState(false);

  const itemsMultiBtn: BtnActions[] = [
    {
      title: "Generar factura",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        // reportDowloadHandler("Factura", "bill_pos", business!, item),
        generatePdf(
          //@ts-ignore
          OrderReportPdf({ order: item, business }),
          "Factura"
        );
      },
    },
    {
      title: "Imprimir factura",
      icon: <FaPrint className="h-5 text-gray-500" />,
      action: () => {
        printPdf(
          BillingReportPdf({ order: item, business, reportType: "billing" }),
          "Factura"
        );
      },
    },
  ];

  // if (
  //   business?.configurationsKey.find((itm) => itm.key === "module_billing")
  //     ?.value === "true" &&
  //   verifyRoles(["ADMIN", "MANAGER_SALES"])
  // ) {
  //   // if (
  //   //   (!item?.paidAt ||
  //   //     (!!item?.paidAt && moment().diff(item.paidAt, "hour") <= 24)) &&
  //   //   item?.status !== "CANCELLED"
  //   // )
  //     // itemsMultiBtn.push({
  //     //   title: "Registrar pago",
  //     //   icon: <FaMoneyBillWave className="h-5 text-gray-500" />,
  //     //   action: () => setPaymentModal(true),
  //     // });
  // }

  const [subtotalCosts, setSubtotalCosts] = useState<
    {
      currency: string;
      price: number;
    }[]
  >([]);

  useEffect(() => {
    const updatedAux = [...subtotalCosts];

    item?.selledProducts.forEach((product) => {
      const existingItem = updatedAux.find(
        (itm) => itm.currency === business?.costCurrency
      );

      if (existingItem) {
        existingItem.price += product?.totalCost ?? 0;
      } else {
        updatedAux.push({
          currency: business?.costCurrency! ?? "",
          price: product?.totalCost! ?? 0,
        });
      }
    });

    setSubtotalCosts(updatedAux);
  }, []);

  //@ts-ignore
  const Exchange_rates: { exchange_rates: ExchangeRatesInterface[] } =
    item !== null && item?.meta !== null
      ? JSON.parse(item?.meta! as string).exchange_rates
      : { exchange_rates: [] };

  const { allowRoles: verifyRoles } = useServer();

  const showCost = verifyRoles(["MANAGER_COST_PRICES", "ADMIN"]);

  return (
    <>
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 mx-auto">
        <div
          className={`divide-gray-200 m-auto rounded-lg border px-5 max-w-lg          
                     border-gray-200`}
        >
          <div className=" mt-8 flex flex-col sm:-mx-6 md:mx-0 w-full">
            <h5 className="text-lg font-medium text-gray-900 inline-flex items-center gap-10">
              Orden: #{item?.operationNumber}{" "}
              {item?.isForTakeAway ? `` : item?.name}
              {item?.isForTakeAway && (
                <span className="">
                  <TruckIcon
                    className="text-gray-900  h-5 z-30"
                    data-tooltip-id="my-tooltip"
                    data-tooltip-content="Para llevar"
                  />
                </span>
              )}
              {item?.houseCosted && (
                <span className="">
                  <HomeModernIcon
                    className="h-5 text-green-600 z-30"
                    data-tooltip-id="my-tooltip"
                    data-tooltip-content="Consumo casa"
                  />
                </span>
              )}
              {item?.discount === 100 && (
                <span className="">
                  <ReceiptPercentIcon
                    className="h-5 text-gray-900"
                    data-tooltip-id="my-tooltip"
                    data-tooltip-content="Descuento 100%"
                  />
                </span>
              )}
              <ReactTooltip place="top" id="my-tooltip" />
              <div className="flex flex-grow justify-end gap-4 py-5">
                <MultipleActBtn size="s" items={itemsMultiBtn} />
              </div>
            </h5>
            <h5 className=" font-medium text-gray-900 flex flex-row items-center">
              <ClockIcon className="text-gray-900 mr-2 h-5" />
              Apertura:{" "}
              {moment().diff(item?.createdAt, "hour") < 24
                ? moment(item?.createdAt).format("hh:mm:ss A")
                : moment(item?.createdAt).format("DD/MM hh:mm:ss A")}
            </h5>
            <h5 className="font-medium text-gray-900 flex flex-row items-center">
              <ClockIcon className="text-gray-900 mr-2 h-5" />
              Cierre: {formatCalendar(item?.closedDate)}
            </h5>
            <h5 className=" font-medium text-gray-900 flex flex-row items-center">
              <UserIcon className="text-gray-900 mr-2 h-5" /> Dependiente:{" "}
              {item?.managedBy?.displayName}
            </h5>
            <h5 className=" font-medium text-gray-900 flex flex-row items-center ">
              <BanknotesIcon className="text-gray-900 mr-2 h-5" />
              Caja:
            </h5>
            <h5 className=" font-medium text-sm text-gray-900">
              Nombre: {item?.salesBy?.displayName}
            </h5>
            <h5 className=" font-medium text-sm text-gray-900">
              Punto de venta: {item?.areaSales?.name}
            </h5>
            {/*Envío*/}
            {item?.shipping && (
              <div className="flex flex-col gap-1 pt-4">
                <h5 className="font-medium text-gray-900">Envío:</h5>
                {Object.values(item?.shipping ?? {}).filter((itm) => !!itm)
                  .length === 0 ? (
                  <p className="text-2xl">-</p>
                ) : (
                  <>
                    {(item?.shipping?.firstName ||
                      item?.shipping?.lastName) && (
                        <p className="text-sm">{`${item?.shipping?.firstName ?? ""
                          } ${item?.shipping?.lastName ?? ""}`}</p>
                      )}
                    {(item?.shipping?.street_1 || item?.shipping?.street_2) && (
                      <p className="text-sm">{`${item?.shipping?.street_1 ?? ""
                        } ${item?.shipping?.street_2 ?? ""}`}</p>
                    )}
                    {item?.shipping?.city && (
                      <p className="text-sm">{item?.shipping.city}</p>
                    )}
                    {item?.shipping?.municipality && (
                      <p className="text-sm">
                        {item?.shipping?.municipality.name}
                      </p>
                    )}
                    {item?.shipping?.province && (
                      <p className="text-sm">{item?.shipping?.province.name}</p>
                    )}
                    {item?.shipping?.country && (
                      <p className="text-sm">
                        {item?.shipping?.country?.name ?? ""}
                      </p>
                    )}
                    {item?.shipping?.email && (
                      <div className="flex flex-col pt-3">
                        <p className="text-sm font-semibold">
                          Dirección de correo electrónico:
                        </p>
                        <a
                          href={"mail:" + item?.shipping?.email}
                          className="text-sm underline text-blue-900"
                        >
                          {item?.shipping?.email}
                        </a>
                      </div>
                    )}
                    {item?.shipping?.phone && (
                      <div className="flex flex-col pt-3">
                        <p className="text-sm font-semibold">Teléfono:</p>
                        <a
                          href={"tel:" + item?.shipping?.phone}
                          className="text-sm underline text-blue-900"
                        >
                          {item?.shipping?.phone}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                  >
                    <div
                      className={classNames(
                        getColorStatusOrder(item?.status),
                        "inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0"
                      )}
                    >
                      {getStatusOrderSpanish(item?.status)}
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0"
                  >
                    Precio Total
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0"
                  >
                    Precio unitario
                  </th>
                  {!item?.houseCosted && showCost && (
                    <th
                      scope="col"
                      className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0"
                    >
                      Costo
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {item?.selledProducts.map((product, index) => (
                  <Fragment key={index}>
                    <tr
                      key={index}
                      className={`${item?.selledProducts.length === index + 1
                        ? "border-b border-gray-200"
                        : ""
                        } ${product.modifiedPrice ? "bg-yellow-200" : ""}`}
                    >
                      {/* Nombre del producto */}
                      <td
                        className={`pl-4 pr-3 text-sm sm:pl-6 md:pl-0 ${product?.status === "REMOVED" ? "line-through" : ""
                          }`}
                      >
                        <div className="font-medium text-gray-900 inline-flex gap-3 items-center">
                          <div>{"(x" + product?.quantity + ")"}</div>
                          <div className="flex flex-col">
                            <p>{product?.name}</p>{" "}
                            {product?.variation && (
                              <p className="text-xs text-gray-500">
                                {product?.variation.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Precio Total */}
                      <td
                        className={`py-1 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0 ${product.status === "REMOVED" && "line-through"
                          }`}
                      >
                        {formatCurrency(
                          product?.priceTotal?.amount,
                          product.priceTotal?.codeCurrency
                        )}
                      </td>

                      {/* Precio unitario */}
                      <td
                        className={`py-1 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0 ${product.status === "REMOVED" && "line-through"
                          }`}
                      >
                        {formatCurrency(
                          product?.priceUnitary?.amount,
                          product.priceTotal?.codeCurrency
                        )}
                      </td>

                      {/* Costo */}
                      {!item?.houseCosted && showCost && (
                        <td
                          className={`py-1 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0 ${product.status === "REMOVED" && "line-through"
                            }`}
                        >
                          {formatCurrency(
                            product.totalCost,
                            business?.costCurrency ?? ""
                          )}
                        </td>
                      )}
                    </tr>
                    {product?.addons?.map((addons, indexAddons) => (
                      <tr
                        key={indexAddons}
                        className={`${product.addons.length === indexAddons + 1
                          ? "border-b border-dotted border-gray-200"
                          : ""
                          }`}
                      >
                        <td
                          className={`pl-4 pr-3 text-sm sm:pl-6 md:pl-0 ${addons.status === "REMOVED" ? "line-through" : ""
                            }`}
                        >
                          <div className="font-medium text-teal-500">
                            {"+(x" + addons.quantity + ")" + " " + addons.name}
                          </div>
                        </td>

                        <td
                          className={`py-1 pl-3 pr-4 text-right text-sm text-teal-500 sm:pr-6 md:pr-0 ${addons.status === "REMOVED" && "line-through"
                            }`}
                        >
                          {formatCurrency(
                            addons.priceUnitary?.amount,
                            addons.priceUnitary?.codeCurrency
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {!item?.houseCosted && item?.discount !== 100 && (
                  <tr className="">
                    <td className="py-1 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">
                        Importe:
                      </div>
                    </td>

                    {/* Subtotal de precio total */}
                    <td className="py-1 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-6 md:pr-0">
                      {item?.prices.map((itemPrice, index) => (
                        <p className="font-medium" key={index}>
                          {formatCurrency(itemPrice.price,
                            itemPrice?.codeCurrency
                          )}
                          {/* {formatCurrency(
                            item?.discount !== null && item?.taxes !== null
                              ? itemPrice.price -
                              itemPrice.price * (item?.discount / 100) +
                              item?.taxes.amount
                              : itemPrice.price -
                              itemPrice.price * (item?.discount / 100),
                            itemPrice?.codeCurrency
                          )} */}
                        </p>
                      ))}
                    </td>

                    {/* Subtotal de precio unitario */}
                    <td className="py-1 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-6 md:pr-0"></td>

                    {/* Subtotal de costo */}
                    {!item?.houseCosted && showCost && (
                      <td className="py-1 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-6 md:pr-0">
                        <p className="font-medium">
                          {subtotalCosts.map((element, index) => (
                            <p className="font-medium" key={index}>
                              {formatCurrency(element.price, element.currency)}
                            </p>
                          ))}
                        </p>
                      </td>
                    )}
                  </tr>
                )}
                {!item?.houseCosted && item?.discount ? (
                  <tr className="">
                    <td className="py-1 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">
                        Descuento:
                      </div>
                    </td>
                    <td className="py-1 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                      {item?.prices.map((itemPrice, index) => (
                        <p key={index}>
                          -{" "}
                          {formatCurrency(
                            item?.discount !== null && item?.taxes !== null
                              ? itemPrice.price * (item?.discount / 100) +
                              item?.taxes?.amount
                              : itemPrice.price * (item?.discount / 100),
                            itemPrice?.codeCurrency
                          )}{" "}
                          ({item?.discount}%)
                        </p>
                      ))}
                    </td>
                  </tr>
                ) : (
                  ""
                )}
                {item?.taxes && (
                  <tr className="">
                    <td className="pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">Taxes:</div>
                    </td>

                    <td className="pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                      {formatCurrency(
                        item?.taxes?.amount,
                        item.taxes.codeCurrency
                      )}
                    </td>
                  </tr>
                )}
                {item?.shippingPrice && (
                  <tr>
                    <td className="pt-2 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">Envíos:</div>
                    </td>

                    <td className="pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                      {formatCurrency(
                        item?.shippingPrice?.amount,
                        item?.shippingPrice?.codeCurrency
                      )}
                    </td>
                  </tr>
                )}
                {item?.couponDiscountPrice && (
                  <tr>
                    <td className="pt-2 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">
                        Descuentos por cupones:
                      </div>
                    </td>

                    <td className="pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                      {"-" +
                        formatCurrency(
                          item?.couponDiscountPrice?.amount,
                          item?.couponDiscountPrice?.codeCurrency
                        )}
                    </td>
                  </tr>
                )}
                {!!item?.tipPrice ? (
                  <tr className="">
                    <td className="pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">
                        Propinas:
                      </div>
                    </td>

                    <td className="pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                      {formatCurrency(
                        item?.tipPrice?.amount,
                        item?.tipPrice?.codeCurrency
                      )}
                    </td>
                  </tr>
                ) : (
                  ""
                )}
                {!!item?.commission && (
                  <tr>
                    <td className="pt-2 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">
                        Comisiones:
                      </div>
                    </td>

                    <td className="pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">
                      {item?.prices.map((itemPrice, index) => (
                        <p key={index}>
                          {" "}
                          {formatCurrency(
                            itemPrice.price * (item?.commission / 100),
                            itemPrice?.codeCurrency
                          )}{" "}
                          ({item?.commission}%)
                        </p>
                      ))}
                    </td>
                  </tr>
                )}
                 {item?.orderModifiers && item.orderModifiers.length !== 0 && (
                  <>
                    {item?.orderModifiers.map((modified, index) => {
                      return (
                        <>
                          <tr className="border-y  border-gray-200">
                            <td className="pt-1 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                              <div className="font-medium text-gray-900">
                                {modified?.showName}:
                              </div>
                            </td>

                            <td className=" py-1 pl-3 pr-4 text-right text-sm font-medium text-gray-900 sm:pr-6 whitespace-pre-wrap md:pr-0">
                              <div className="flex flex-col">
                                <div>
                                  <div className="relative">
                                    <span
                                      className=" inline-flex gap-2 justify-end"
                                      key={index}
                                    >
                                      {formatCurrency(
                                        modified?.amount,
                                        modified?.codeCurrency
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <ReactTooltip place="top" id="my-tooltip" />
                          </tr>
                        </>
                      );
                    })}
                  </>
                )}
                <tr className="">
                  <td className="py-1 pt-2 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                    <div className="font-medium  text-gray-900">Subtotal:</div>
                  </td>

                  {/* Espacio vacio */}
                  {/* <td className="py-1 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-6 md:pr-0">

                  </td> */}

                  <td className="py-1 pl-3 pr-4 flex flex-col text-right text-sm font-medium text-gray-900 sm:pr-6 md:pr-0"></td>

                  <td className="py-1 pl-3 pr-4 flex flex-col text-right text-sm font-medium text-gray-900 sm:pr-6 md:pr-0">
                    {item?.houseCosted
                      ? formatCurrency(item?.totalCost, business?.costCurrency)
                      : item?.totalToPay.map((itm, idx) => (
                        <p key={idx}>
                          {formatCurrency(itm?.amount, itm?.codeCurrency)}
                        </p>
                      ))}
                  </td>
                </tr>

                {item?.currenciesPayment &&
                  item?.currenciesPayment.length !== 0 && (
                    <tr className="border-t  border-gray-200">
                      <td className="pt-1 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                        <div className="font-medium text-gray-900">
                          Total pagado:
                        </div>
                      </td>

                      <td className=" py-1 pl-3 pr-4 text-right text-sm font-medium text-gray-900 sm:pr-6 whitespace-pre-wrap md:pr-0">
                        <div className="flex flex-col">
                          {item?.currenciesPayment.map(
                            (currencyPayment, index) => {
                              return (
                                <div>
                                  <div className="relative">
                                    <span
                                      className=" inline-flex gap-2 justify-end"
                                      key={index}
                                    >
                                      {formatCurrency(
                                        currencyPayment?.amount,
                                        currencyPayment?.codeCurrency
                                      )}
                                      {currencyPayment?.paymentWay ===
                                        "CASH" ? (
                                        <BanknotesIcon
                                          className="h-5"
                                          data-tooltip-id="my-tooltip"
                                          data-tooltip-content="Efectivo"
                                        />
                                      ) : (
                                        <CreditCardIcon
                                          className="h-5"
                                          data-tooltip-id="my-tooltip"
                                          data-tooltip-content="Transferencia"
                                        />
                                      )}
                                      {item?.amountReturned &&
                                        currencyPayment?.codeCurrency !==
                                        item?.amountReturned?.codeCurrency &&
                                        Exchange_rates.exchange_rates?.length >
                                        0 && (
                                          // (item?.amountReturned && currencyPayment.codeCurrency !== item.amountReturned.codeCurrency && item?.meta?.Exchange_rates) && (
                                          <span className="absolute top-0 left-32 whitespace-nowrap">
                                            {`(1 ${currencyPayment?.codeCurrency
                                              } = ${Exchange_rates.exchange_rates.find(
                                                (curr) =>
                                                  curr.code ===
                                                  currencyPayment?.codeCurrency
                                              )?.exchangeRate
                                              } ${business?.mainCurrency})`}
                                          </span>
                                        )}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </td>

                      <ReactTooltip place="top" id="my-tooltip" />
                    </tr>
                  )}

                
                {item?.amountReturned && (
                  <tr className="border-b border-gray-200">
                    <td className="py-1 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
                      <div className="font-medium  text-gray-900">Cambio:</div>
                    </td>
                    <td className="py-1 pl-3 pr-4 text-right text-sm text-gray-900 sm:pr-6 md:pr-0">
                      {formatCurrency(
                        item?.amountReturned?.amount,
                        item?.amountReturned?.codeCurrency
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {paymentModal && (
        <Modal state={paymentModal} close={setPaymentModal} size="m">
          <PaymentContainer
            order={item!}
            closeModal={() => setPaymentModal(false)}
            updState={updateOrderState}
          />
        </Modal>
      )}
    </>
  );
};

export default Details;
