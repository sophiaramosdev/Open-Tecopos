import {
  formatCalendar,
  formatCalendarDetailsOrderWithoutHour,
  formatCurrencyV2,
  generatePdf,
} from "../../../utils/helpers";
import ImageComponent from "../../../components/misc/Images/Image";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { translateOrderState } from "../../../utils/translate";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../store/hooks";
import { onlineOrderFlow, wooOrderFlow } from "../../../utils/staticData";
import {
  KeyNomenclator,
  PriceInvoiceInterface,
} from "../../../interfaces/ServerInterfaces";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import Select from "../../../components/forms/Select";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import { AiOutlineSync } from "react-icons/ai";
import MultipleActBtn from "../../../components/misc/MultipleActBtn";
import { FaRegFilePdf } from "react-icons/fa";
import { MdOutlinePayment } from "react-icons/md";
import { useContext, useState } from "react";
import Modal from "../../../components/misc/GenericModal";
import reportDownloadHandler from "../../../reports/helpers/reportDownloadHandler";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import { TrashIcon } from "@heroicons/react/24/outline";
import { OnlineOrderContext } from "./OnlineOrderDetailContainer";
import moment from "moment";
import DateInput from "../../../components/forms/DateInput";
import { CiCalendarDate } from "react-icons/ci";
import OrderReportPdf from "../../../reports/OrderReportPdf";
import useServer from "../../../api/useServerMain";
import PaymentContainer2 from "../../billing/register/registerDetailsTabs/payment/PaymentContainerV2";
import { useServerBilling } from "../../../api/useServerBilling";

const Details = () => {
  const { business } = useAppSelector((state) => state.init);
  const { allowRoles: verifyRoles } = useServer();
  const { deletePartialPayment, isFetching } = useServerBilling();
  const [paymentModal, setPaymentModal] = useState(false);
  const {
    control,
    order,
    syncFetching,
    syncronizeOnlineOrder,
    formState,
    editOrder,
    fetching,
    updateSingleOrderState,
  } = useContext(OnlineOrderContext);

  const currentStatus = order?.status ?? "";

  const wooStatusSelect: SelectInterface[] =
    wooOrderFlow
      .filter(
        (itm) =>
          itm.beforeHop.includes(currentStatus) || itm.code === currentStatus
      )
      .map((item) => ({
        id: item.code,
        name: translateOrderState(item.code),
      })) ?? [];

  const onlineStatusSelect: SelectInterface[] =
    onlineOrderFlow
      .filter(
        (itm) =>
          itm.beforeHop.includes(currentStatus) || itm.code === currentStatus
      )
      .map((item) => ({
        id: item.code,
        name: translateOrderState(item.code),
      })) ?? [];

  //Products Table-----------------------------------------------------
  const tableTitles = ["Nombre", "Cantidad", "Precio unitario", "Precio total"];
  const tableData: DataTableInterface[] =
    order?.selledProducts?.map((item) => {
      return {
        rowId: item.id,
        payload: {
          Nombre: (
            <div className="inline-flex gap-2 items-center">
              <ImageComponent
                src={item?.image?.src}
                hash={item?.image?.blurHash}
                className="h-10 w-10 rounded-lg overflow-hidden"
              />
              <div className="flex flex-col">
                <p>{item.name}</p>
                {item.variation && (
                  <p className="text-xs text-gray-400">{item.variation.name}</p>
                )}
              </div>
            </div>
          ),
          Cantidad: item.quantity,
          "Precio unitario": formatCurrencyV2(
            item?.priceUnitary?.amount,
            item?.priceUnitary?.codeCurrency
          ),
          "Precio total": formatCurrencyV2(
            item?.priceTotal?.amount,
            item?.priceTotal?.codeCurrency
          ),
        },
      };
    }) ?? [];

  const rowTotals: {
    name: string;
    amount: string | PriceInvoiceInterface | PriceInvoiceInterface[];
  }[] = [
      {
        name: "Subtotal",
        amount:
          order?.prices?.map((itm) => ({
            amount: itm.price,
            codeCurrency: itm.codeCurrency,
          })) ?? [],
      },
    ];

  if (order?.shippingPrice)
    rowTotals.push({
      name: "Costo de envío",
      amount: order?.shippingPrice,
    });

  if (order?.taxes)
    rowTotals.push({
      name: "Impuestos",
      amount: order?.taxes,
    });

  if (order?.couponDiscountPrice || order?.discount !== 0) {
    const discount: PriceInvoiceInterface[] = [];
    if (order?.couponDiscountPrice) discount.push(order.couponDiscountPrice);
    if (order?.discount !== 0) {
      order?.prices.forEach((item) => {
        const amount = (order.discount / 100) * item.price;
        const idx = discount.findIndex(
          (elem) => elem.codeCurrency === item.codeCurrency
        );
        if (idx !== -1) {
          discount.splice(idx, 1, {
            ...discount[idx],
            amount: discount[idx].amount + amount,
          });
        } else {
          discount.push({ amount: amount, codeCurrency: item.codeCurrency });
        }
      });
    }
    rowTotals.push({ name: "Descuentos", amount: discount });
  }

  rowTotals.push({
    name: "Total",
    amount: order?.totalToPay ?? [],
  });
  if (order?.paymentGateway) {
    rowTotals.push({
      name: "Pasarela de pago",
      amount: order.paymentGateway.name,
    });
  }

  const rowTotal = {
    rowId: "totals",
    payload: {
      Nombre: "",
      Cantidad: "",
      "Precio unitario": (
        <div className="flex flex-col gap-y-1">
          {rowTotals.map((title, idx) => {
            if (Array.isArray(title.amount)) {
              return title.amount.map((_, ix) => (
                <div key={ix} className="p-0 h-4 font-semibold text-right">
                  {ix === 0 ? title?.name : ""}
                </div>
              ));
            } else {
              return (
                <p key={idx} className="p-0 h-4 font-semibold text-right">
                  {title?.name}
                </p>
              );
            }
          })}
        </div>
      ),
      "Precio total": (
        <div className="flex flex-col gap-y-1">
          {rowTotals.map((item, idx) => {
            if (Array.isArray(item.amount)) {
              return item.amount.map((elem, ix) => (
                <div key={ix} className="p-0 h-4 font-semibold text-left">
                  {formatCurrencyV2(elem.amount, elem.codeCurrency)}
                </div>
              ));
            } else if (typeof item.amount === "string") {
              return (
                <p key={idx} className="p-0 h-4 font-semibold text-left">
                  {item.amount}
                </p>
              );
            } else {
              return (
                <p key={idx} className="p-0 h-4 font-semibold text-left">
                  {formatCurrencyV2(
                    item.amount.amount,
                    item.amount.codeCurrency
                  )}
                </p>
              );
            }
          })}
        </div>
      ),
    },
  };
  tableData.length !== 0 && tableData.push(rowTotal);
  const invoiceBusinessName = business!.configurationsKey.find(
    (configuration: KeyNomenclator) =>
      configuration.key === "invoice_business_name"
  )?.value;

  const [modifyDeliveryDate, setModifyDeliveryDate] = useState(false);

  const actions = [];

  // if (
  //   business?.configurationsKey.find((itm) => itm.key === "module_billing")
  //     ?.value === "true" &&
  //   verifyRoles(["ADMIN", "MANAGER_SALES"])
  // ) {
  //   if (order?.status !== "BILLED") {
  //     actions.push({
  //       title: "Registro de pago",
  //       icon: <MdOutlinePayment className="text-xl text-gray-500" />,
  //       action: !!order?.economicCycle
  //         ? () => null
  //         : () => setPaymentModal(true),
  //     });
  //   }
  // }

  actions.push(
    {
      title: "Exportar Albarán",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        reportDownloadHandler("Albarán", "delivery", business!, order);
      },
    },
    {
      title: "Exportar Factura",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        // reportDownloadHandler(
        //   "Factura",
        //   "bill",
        //   {
        //     ...business!,
        //     name: invoiceBusinessName || business!.name,
        //   },
        //   { ...order, invoiceObservations }
        // );

        generatePdf(OrderReportPdf({ order, business }), "Factura");
      },
    }
  );
  return (
    <div className="px-3 h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
      <div className="flex justify-between items-center">
        <h3 className="text-gray-700 font-semibold text-xl">{`Pedido #${order?.operationNumber ?? ""
          }`}</h3>
        <div className="inline-flex items-center gap-2">
          <MultipleActBtn btnName="Acciones" items={actions} />
          {(order?.status === "WITH_ERRORS" ||
            order?.selledProducts.length === 0) &&
            !!order?.externalId && (
              <Button
                color="red-500"
                textColor="red-500"
                icon={
                  <AiOutlineSync
                    className={`text-lg ${syncFetching ? "animate-spin" : "animate-none"
                      }`}
                  />
                }
                action={() => syncronizeOnlineOrder!(order.externalId)}
                outline
              />
            )}
        </div>
      </div>
      {order?.economicCycle && (
        <div className="mt-2 p-2 border rounded-lg text-gray-500 text-sm">
          {`Esta orden fue transferida al Punto de Venta ${order.areaSales.name
            } en el ciclo economico: ${moment(
              order.economicCycle.openDate
            ).format("DD[-]MM[-]YYYY")}`}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <div className="inline-flex gap-2">
          <p className="text-gray-600 font-semibold">Fecha de creación:</p>
          <p className="text-gray-500">{formatCalendar(order?.createdAt!)}</p>
        </div>
        <div className="inline-flex gap-2">
          <p className="text-gray-600 font-semibold">Pagado:</p>
          <p className="text-gray-500">
            {order?.paidAt ? formatCalendar(order.paidAt) : "-"}
          </p>
        </div>
        <div className="inline-flex gap-5 items-center w-full">
          <p className="text-gray-600 font-semibold">Estado:</p>
          {(wooStatusSelect.length === 1 && onlineStatusSelect.length === 1) ||
            (wooStatusSelect.length === 0 && onlineStatusSelect.length === 0) ? (
            <OrderStatusBadge status={order?.status} />
          ) : (
            <Select
              className="p-0 w-full"
              name="status"
              data={
                order?.origin === "woo" ? wooStatusSelect : onlineStatusSelect
              }
              control={control}
              defaultValue={order?.status}
              disabled={!!order?.economicCycle}
            />
          )}
        </div>
        <div className="inline-flex gap-2">
          <p className="text-gray-600 font-semibold">Cliente:</p>
          <p className="text-gray-500">
            {order?.client?.firstName || order?.client?.lastName
              ? `${order?.client?.firstName ?? ""} ${order?.client?.lastName}`
              : order?.client?.email ?? "Invitado"}
          </p>
        </div>
        <div className="inline-flex gap-5 items-center w-full">
          <p className="text-gray-600 font-semibold">Repartidor:</p>
          {
            <>
              <AsyncComboBox
                className="w-full"
                name="shippingById"
                dataQuery={{
                  url: "/shipping/deliverers",
                  defaultParams: { all_data: true },
                }}
                normalizeData={{
                  id: "id",
                  name: ["displayName", "username"],
                }}
                control={control}
                defaultItem={
                  !!order?.shippingBy
                    ? {
                      id: order?.shippingBy?.id,
                      name:
                        order?.shippingBy?.displayName ??
                        order.shippingBy.username,
                    }
                    : undefined
                }
                disabled={
                  ["DELIVERED", "CANCELLED"].includes(order?.status ?? "") ||
                  !!order?.economicCycle
                }
              />
            </>
          }
          <Button
            color="red-500"
            icon={<TrashIcon className="h-5" />}
            outline
            textColor="red-500"
            action={() =>
              editOrder!(
                order!.id,
                { shippingById: null },
                updateSingleOrderState
              )
            }
            loading={fetching && !formState!.isSubmitting}
            disabled={fetching}
          />
        </div>
      </div>
      {/*Envío y facturación*/}
      <div className="m-auto grid grid-cols-2 gap-10 py-5">
        {/*Envío*/}
        <div className="flex flex-col gap-1">
          <h5 className="font-semibold text-md">Envío:</h5>
          {Object.values(order?.shipping ?? {}).filter((itm) => !!itm)
            .length === 0 ? (
            <p className="text-2xl">-</p>
          ) : (
            <>
              {(order?.shipping?.firstName || order?.shipping?.lastName) && (
                <p className="text-sm">{`${order?.shipping?.firstName ?? ""} ${order?.shipping?.lastName ?? ""
                  }`}</p>
              )}
              {(order?.shipping?.street_1 || order?.shipping?.street_2) && (
                <p className="text-sm">{`${order?.shipping?.street_1 ?? ""} ${order?.shipping?.street_2 ?? ""
                  }`}</p>
              )}
              {order?.shipping?.city && (
                <p className="text-sm">{order?.shipping.city}</p>
              )}
              {order?.shipping?.municipality && (
                <p className="text-sm">{order?.shipping?.municipality.name}</p>
              )}
              {order?.shipping?.province && (
                <p className="text-sm">{order?.shipping?.province.name}</p>
              )}
              {order?.shipping?.country && (
                <p className="text-sm">
                  {order?.shipping?.country?.name ?? ""}
                </p>
              )}
              {order?.shipping?.email && (
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">
                    Dirección de correo electrónico:
                  </p>
                  <p className="text-sm underline text-blue-900">
                    {order.shipping?.email}
                  </p>
                </div>
              )}

              {order?.shipping?.phone && (
                <div className="flex flex-col pt-3">
                  <p className="text-sm font-semibold">Teléfono:</p>
                  <a
                    href={"tel:" + order.shipping?.phone}
                    className="text-sm underline text-blue-900"
                  >
                    {order.shipping?.phone}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/*Facturación*/}
        <div className="flex flex-col gap-1">
          <h5 className="font-semibold text-md">Facturación:</h5>
          {Object.values(order?.billing ?? {}).filter((itm) => !!itm).length ===
            0 ? (
            <p className="text-2xl">-</p>
          ) : (
            <>
              {(order?.billing?.firstName || order?.billing?.lastName) && (
                <p className="text-sm">{`${order?.billing?.firstName ?? ""} ${order?.billing?.lastName ?? ""
                  }`}</p>
              )}
              {(order?.billing?.street_1 || order?.billing?.street_2) && (
                <p className="text-sm">{`${order?.billing?.street_1 ?? ""} ${order?.billing?.street_2 ?? ""
                  }`}</p>
              )}
              {order?.billing?.city && (
                <p className="text-sm">{order?.billing.city}</p>
              )}
              {order?.billing?.municipality && (
                <p className="text-sm">{order?.billing?.municipality?.name}</p>
              )}
              {order?.billing?.province && (
                <p className="text-sm">{order?.billing?.province?.name}</p>
              )}
              {order?.billing?.country && (
                <p className="text-sm">{order?.billing?.country?.name ?? ""}</p>
              )}
              {order?.billing?.email && (
                <div className="flex flex-col pt-3">
                  <p className="text-sm font-semibold">
                    Dirección de correo electrónico:
                  </p>
                  <a
                    href={"mail:" + order?.billing?.email}
                    className="text-sm underline text-blue-900"
                  >
                    {order.billing?.email}
                  </a>
                </div>
              )}
              {order?.billing?.phone && (
                <div className="flex flex-col pt-3">
                  <p className="text-sm font-semibold">Teléfono:</p>
                  <a
                    href={"tel:" + order.billing?.phone}
                    className="text-sm underline text-blue-900"
                  >
                    {order.billing?.phone}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Entrega en Tienda */}
        {order?.deliveryAt && (
          <div className="flex gap-5 items-center">
            {modifyDeliveryDate ? (
              <DateInput
                label="Fecha de entrega"
                name="deliveryAt"
                control={control}
                defaultValue={order?.deliveryAt}
                includeTime
              />
            ) : (
              <>
                <p className="text-sm font-semibold">
                  {`${order?.pickUpInStore ? "Recogida en tienda: " : "Entrega: "
                    } ${order?.pickUpInStore ? formatCalendar(order?.deliveryAt) : formatCalendarDetailsOrderWithoutHour(order?.deliveryAt)}`}
                </p>
                <CiCalendarDate
                  className="hover:cursor-pointer text-xl"
                  onClick={() => setModifyDeliveryDate(true)}
                />
              </>
            )}
          </div>
        )}
      </div>

      {order?.customerNote && (
        <div className="flex flex-col pt-3">
          <p className="text-sm font-semibold">Nota ofrecida por el cliente:</p>
          <p className="text-sm">{order.customerNote}</p>
        </div>
      )}
      <TextArea
        name="observations"
        label="Observaciones"
        control={control}
        defaultValue={order?.observations}
      />
      <div className="flex flex-col gap-2 mt-2 w-full">
        <h5 className="font-semibold text-md">Artículos:</h5>
        <GenericTable tableTitles={tableTitles} tableData={tableData} />
      </div>

      {/*Cupones*/}
      {/* @ts-ignore */}
      {order?.coupons.length > 0 && (
        <div className="flex flex-row gap-1 mt-2">
          <h5 className="font-semibold text-md">Cupones:</h5>
          {/* @ts-ignone */}
          {order?.coupons
            .map((coupon) => {
              //@ts-ignore
              return coupon.code;
            })
            .join(", ")}
        </div>
      )}

      {paymentModal && (
        <Modal state={paymentModal} close={setPaymentModal} size="l">
          <PaymentContainer2
            closeModal={() => setPaymentModal(false)}
            dependencies={{
              isFetching,
              order,
              deletePartialPayment,
              updateAllOrdersState: () => { },
              updateSingleOrderState,
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default Details;

/*  */
