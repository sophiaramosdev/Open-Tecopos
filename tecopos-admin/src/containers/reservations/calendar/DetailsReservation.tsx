import { FaCircle, FaPen } from "react-icons/fa";
import MultipleActBtn from "../../../components/misc/MultipleActBtn";
import { FaX } from "react-icons/fa6";
import Button from "../../../components/misc/Button";
import { useContext, useEffect } from "react";
import { ReservationsContext } from "./CalendarReservation";
import Fetching from "../../../components/misc/Fetching";
import { useAppSelector } from "../../../store/hooks";
import { formatCurrency } from "../../../utils/helpers";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import ImageComponent from "../../../components/misc/Images/Image";
import moment from "moment";
import { ModalAlert } from "../../../components";
import { useState } from "react";
import TabNav from "../../../components/navigation/TabNav";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import useServerProduct from "../../../api/useServerProducts";
import SideNav from "../../../components/misc/SideNav";
import { RegisterDetailsContainer } from "./details/RegisterDetailsContainer";
import { useServerBilling } from "../../../api/useServerBilling";

interface Props {
  close: Function;
  select: number | string;
  orderId?: number;
  context: React.Context<any>;
}
const DetailsReservations = ({ close, select, context, orderId }: Props) => {
  const {
    isFetching,
    isLoading,
    reservation,
    getReservation = () => {},
    cancelOrder = () => {},
    setShowEdit = () => {},
    confirmOrder,
    cancelReservation,
  } = useContext(context);
  const {
    getProduct,
    product,
    isLoading: loadingProduct = true,
  } = useServerProduct();
  const {
    orderById,
    getOrderBillingById,
    isLoading: isLoadingOrder,
    updateSingleOrderState,
    deletePartialPayment,
    isFetching: isFetchingOrder,
    isFetchingAux,
    setIsLoading,
  } = useServerBilling();

  const [cancelModal, setCancelModal] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const { business } = useAppSelector((store) => store.init);

  const statusNotEdit = ["CANCELLED", "REFUNDED", "BILLED"];
  const actions = [];

  if (!statusNotEdit.includes(reservation?.orderReceipt?.status ?? "")) {
    actions.push({
      title: "Reprogramar",
      icon: <FaPen className="text-gray-500 h-5" />,
      action: () => {
        close();
        setShowEdit(true);
      },
    });
  }
  if (
    reservation?.orderReceipt.status !== "CANCELLED" &&
    reservation?.orderReceipt.status !== "REFUNDED"
  ) {
    actions.push({
      title: "Cancelar",
      icon: <FaX className="text-gray-500 h-4" />,
      action: () => setCancelModal(true),
    });
  }
  if (reservation?.orderReceipt?.isPreReceipt) {
    actions.push({
      title: "Confirmar",
      icon: <FaCircle className="text-gray-500 h-4" />,
      action: () => {
        confirmOrder && confirmOrder(reservation.orderReceiptId, close);
        // close();
        // setShowConfirm(true);
      },
    });
  }
  useEffect(() => {
    getReservation(select);
    getOrderBillingById(orderId as number);
  }, [select]);

  // useEffect(() => {
  //   if (reservation?.productId) {
  //     const id: any = reservation?.productId;
  //     getProduct(id);
  //   }
  // }, [reservation]);

  const [currentTab, setCurrentTab] = useState<"details" | "hist">("details");
  const [currentTab2, setCurrentTab2] = useState<"details" | "order">(
    "details"
  );
  const tabs = [
    {
      name: "Detalles de la reserva",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Historial de Reservas",
      href: "hist",
      current: currentTab === "hist",
    },
  ];
  const tabs2 = [
    {
      name: "Detalles de la reserva",
      href: "details",
      current: currentTab2 === "details",
    },
    {
      name: "Detalles de la orden",
      href: "order",
      current: currentTab2 === "order",
    },
  ];

  const tableTitles = [
    "Acción",
    "Estado de reserva",
    "Fecha",
    "Realizada por",
    "Detalles",
  ];
  const displayData: DataTableInterface[] = [];

  if (reservation?.records && reservation?.records?.length > 0) {
    reservation?.records?.forEach((item: any) => {
      displayData.push({
        payload: {
          Acción: item?.title,
          "Estado de reserva": <OrderStatusBadge status={item.status} />,
          Fecha: moment(item?.createdAt).format("DD/MM/YY"),
          "Realizada por": item?.madeBy?.displayName ?? "",
          Detalles: <p className="text-start">{item?.details}</p>,
        },
      });
    });
  }

  const startDateAt = moment(reservation?.startDateAt ?? "");
  const endDateAt = moment(reservation?.endDateAt) ?? "";

  const endInSomeDay =
    startDateAt.diff(endDateAt, "days") === 0 && !reservation.orderReceipt.isPreReceipt
      ? endDateAt.add(1, "day").format("DD/MM/YY")
      : endDateAt.format("DD/MM/YY");

  if (isLoading || isLoadingOrder)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <div className="h-[500px] overflow-auto ">
      {isFetching && <Fetching />}
      <header>
        <TabNav action={setCurrentTab2} tabs={tabs2} />
      </header>

      {currentTab2 === "order" && (
        <section>
          <RegisterDetailsContainer
            dependencies={{
              orderById,
              getOrderBillingById,
              isLoadingOrder,
              updateSingleOrderState,
              deletePartialPayment,
              isFetchingOrder,
              isFetchingAux,
              setIsLoading,
            }}
            context={context}
            id={orderId}
            closeModalDetails={close}
            updateState={() => {}}
          />
        </section>
      )}

      {currentTab2 === "details" && (
        <section className="scroll-auto overflow-auto">
          <section className="grid grid-cols-12 ">
            <aside className="col-span-2">
              <SideNav tabs={tabs} action={setCurrentTab} />
            </aside>

            {currentTab === "details" && (
              <section className="col-span-10 px-4">
                <div className="border rounded-md p-5 py-5">
                  <header className="flex justify-end ">
                    {reservation?.orderReceipt.status !== "CANCELLED" && (
                      <MultipleActBtn btnName="Acciones" items={actions} />
                    )}
                  </header>

                  <section className="grid grid-cols-2 gap-x-4  ">
                    <article className="grid grid-cols-2 gap-x-5">
                      <div className="flex flex-col gap-y-2 items-start font-semibold">
                        <span>Fecha:</span>
                        <span>Estado de la reserva:</span>
                        <span>Cliente:</span>
                        <span>Negocio:</span>
                        <span>Servicio:</span>
                        <span>Recurso:</span>
                        <span>Precio por servicio:</span>
                        <span>Precio total:</span>
                        {<span>Duración:</span>}
                      </div>

                      <div className="flex flex-col gap-y-2 items-start">
                        <span>
                          {reservation?.product?.hasDuration
                            ? `${startDateAt.format(
                                "DD/MM/YY"
                              )} - ${startDateAt.format("HH:mm")}`
                            : `${startDateAt.format(
                                "DD/MM/YY"
                              )} - ${endInSomeDay}`}
                        </span>
                        <span>
                          <OrderStatusBadge
                            status={reservation?.orderReceipt?.status}
                          />
                        </span>
                        <span>
                          {reservation?.orderReceipt?.client?.firstName}{" "}
                          {reservation?.orderReceipt?.client?.lastName}
                        </span>
                        <span>{business?.name}</span>
                        <span>{reservation?.name}</span>
                        <span className="row-start-6">
                          {reservation?.resource?.code ?? "-"}
                        </span>
                        <span>
                          {formatCurrency(
                            reservation?.priceUnitary?.amount as number,
                            reservation?.priceUnitary?.codeCurrency
                          )}
                        </span>
                        <span>
                          {formatCurrency(
                            reservation?.priceTotal?.amount as number,
                            reservation?.priceTotal?.codeCurrency
                          )}
                        </span>
                        <span>
                          {reservation?.product.hasDuration
                            ? reservation.product.duration
                            : calculateDateDifference(
                                reservation?.startDateAt ?? "",
                                reservation?.endDateAt ?? "",
                                reservation?.product?.hasDuration
                              )}{" "}
                        </span>
                      </div>
                    </article>
                  </section>
                </div>
                {/* <footer className="flex flex-col items-center justify-center mt-6">
              <div className=" min-w-[300px]">
                <Button
                  name="Aceptar"
                  color="indigo-700"
                  type="submit"
                  full
                  action={close}
                />
              </div>
            </footer> */}
                {cancelModal && (
                  <ModalAlert
                    type="warning"
                    title={`Cancelar reserva `}
                    text={`¿Esta seguro de querer cancelar esta reserva. Esta operación no se puede deshacer.`}
                    onAccept={() => {
                      if (orderById?.selledProducts?.length! > 1) {
                        cancelReservation(
                          reservation?.orderReceiptId,
                          { idReservation: reservation.id },
                          close,
                          false
                        );
                      } else {
                        cancelOrder!(reservation?.orderReceiptId, close);
                      }

                      setCancelModal(false);
                    }}
                    onClose={() => setCancelModal(false)}
                    isLoading={isFetching}
                  />
                )}
                {confirm && (
                  <ModalAlert
                    type="warning2"
                    title={`Confirmar reserva `}
                    text={`¿Esta seguro de desea confirmar esta reserva. Esta operación no se puede deshacer.`}
                    onAccept={() => {
                      confirmOrder!(reservation?.orderReceiptId, close);
                      setConfirm(false);
                    }}
                    onClose={() => setConfirm(false)}
                    isLoading={isFetching}
                  />
                )}
              </section>
            )}
            {currentTab === "hist" && (
              <section className="px-8 py-3 col-span-10 ">
                <GenericTable
                  tableTitles={tableTitles}
                  tableData={displayData}
                />
              </section>
            )}
          </section>
        </section>
      )}
    </div>
  );
};

export default DetailsReservations;

const calculateDateDifference = (
  fechaInicio: string,
  fechaFin: string,
  hasDuration: boolean | undefined
) => {
  const start = moment(fechaInicio).startOf("day");
  const end = moment.utc(fechaFin).endOf("day");
  const diferencia = end.diff(start, "days");

  const isSameDay = !hasDuration
    ? start.format("YYYY-MM-DD") === end.format("YYYY-MM-DD")
    : false;

  if (diferencia === 0 && !isSameDay) {
    const diferenciaEnHoras = end.diff(start, "hours");
    return `${diferenciaEnHoras} horas`;
  }
  if (diferencia === 1 && !hasDuration) {
    return `${diferencia} día`;
  }
  if (diferencia === 1) {
    return `${diferencia} día`;
  } else {
    return `${diferencia === 0 ? 1 : diferencia} días`;
  }
};
