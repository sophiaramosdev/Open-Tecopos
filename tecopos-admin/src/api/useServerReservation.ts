/* eslint-disable array-callback-return */
import { useState } from "react";
import query from "./APIServices";
import {
  OrderInterface,
  PaginateInterface,
} from "../interfaces/ServerInterfaces";
import useServer from "./useServerMain";
import {
  exportExcel,
  formatCurrency,
  generateUrlParams,
} from "../utils/helpers";
import { toast } from "react-toastify";
import { BasicType } from "../interfaces/InterfacesLocal";
import { Reservation } from "../interfaces/Interfaces";
import moment from "moment";
import {
  translateOrderOrigin,
  translateOrderState,
  translateOrderStatePay,
} from "../utils/translate";
import { Event2 } from "../components/calendar/GenericCalendar";

export const useServerReservation = () => {
  const { manageErrors } = useServer();
  const [paginate, setPaginate] = useState<PaginateInterface>({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [allEvents, setEvents] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [clientOrders, setClientOrders] = useState<OrderInterface[]>([]);
  const [isAvailability, setIsAvailability] = useState<any>(false);
  let events: Event2[] = [];

  const getAllReservations = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/reservation${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllReservations(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
    setIsAvailability(false);
  };
  const getAllEvents = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsLoadingEvent(true);
    await query
      .get(
        `/administration/reservation/event/block-time${generateUrlParams(
          filter
        )}`
      )
      .then((resp) => {
        setEvents(resp.data.items);
      })
      .catch((e) => manageErrors(e));
    setIsLoadingEvent(false);
  };
  const chekcAvailability = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsChecking(true);
    return await query
      .get(
        `/administration/reservation/check/availability${generateUrlParams(
          filter
        )}`
      )
      .then((resp) => {
        setIsAvailability(true);
        toast.success("Disponible para reservar");
        return true;
      })
      .catch((e) => {
        manageErrors(e);
      })
      .finally(() => {
        setIsChecking(false);
      });
  };

  const newReservation = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/reservation", data)
      .then((resp) => {
        const order = resp.data;
        const newArr = order.selledProducts.map((item: any) => {
          return {
            ...item,
            orderReceipt: order,
            orderReceiptId: order.id,
          };
        });
        setAllReservations([...(newArr ?? []), ...allReservations]);
        setPaginate({
          ...paginate,
          totalItems: paginate?.totalItems + 1 ?? 0,
        });
        callback();
        toast.success("Reserva creada con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const newTimeBlock = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/reservation/event/block-time", data)
      .then((resp) => {
        setEvents([resp.data, ...allEvents]);
        callback && callback();
        toast.success("Tiempo de bloqueo aplicado");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editReservation = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callBack: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/reservation/${id}`, data)
      .then((resp) => {
        const order = resp.data;
        const newArr = order.selledProducts.map((item: any) => {
          return {
            ...item,
            orderReceipt: order,
            orderReceiptId: order.id,
          };
        });
        const update = allReservations.map((item) => {
          const searchToUpdate = newArr.find((ele: any) => ele.id === item.id);
          if (searchToUpdate) {
            return searchToUpdate;
          }
          return item;
        });
        setAllReservations(update);
        toast.success("Datos actualizados");
        callBack && callBack();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const editTimeBlock = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/reservation/event/block-time/${id}`, data)
      .then((resp) => {
        const newEvents = allEvents.map((item: any) => {
          if (item.id === id) {
            return resp.data;
          }
          return item;
        });

        setEvents(newEvents);
        callback();
        toast.success("Datos actualizados");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const cancelReservation = async (
    id: number,
    data: any,
    callBack: Function,
    clearData: boolean = true
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/reservation/${id}`, data)
      .then((resp) => {
        const update = allReservations.filter(
          (item) => item.id !== data.idReservation
        );
        if (clearData) {
          setAllReservations(update);
        }
        const udpate = events.filter((item) => item.id !== data.idReservation);
        events = [...udpate];
        //setAllReservations(newReservation);
        callBack && callBack();
        toast.success("Se canceló la reserva correctamente");
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };
  const cancelOrder = async (id: number, callBack: Function): Promise<void> => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/billing-order/${id}`, {})
      .then((resp) => {
        const order = resp.data;
        const newArr = order.selledProducts.map((item: any) => {
          return {
            ...item,
            orderReceipt: order,
          };
        });
        const update = allReservations.map((item) => {
          if (item.id === newArr[0].id) {
            return newArr[0];
          }
          return item;
        });
        setAllReservations(update);
        const ids = resp.data.selledProducts.map((item: any) => item.id);
        const udpate = events.filter((item) => !ids.includes(item.id));
        events = [...udpate];
        //setAllReservations(newReservation);
        callBack && callBack();
        toast.success("Se canceló la reserva correctamente");
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const confirmOrder = async (
    id: number,
    callBack: Function
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .post(`/administration/reservation/confirm/${id}`, {})
      .then((resp) => {
        const order = resp.data;
        const newArr = order.selledProducts.map((item: any) => {
          return {
            ...item,
            orderReceipt: order,
          };
        });
        const update = allReservations.map((item) => {
          if (item.id === newArr[0].id) {
            return newArr[0];
          }
          return item;
        });
        setAllReservations(update);
        callBack && callBack();
        toast.success("La reserva fue confirmada");
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const deletedTimeBlock = async (id: number, callback?: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/reservation/event/block-time/${id}`, {})
      .then((resp) => {
        const newEvents = allEvents.filter((item: any) => item.id !== id);
        setEvents(newEvents);
        toast.success("Tiempo de bloqueo eliminado ");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteClient = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/client-shipping/client/${id}`, {})
      .then(() => {
        setAllReservations(allReservations.filter((item) => item.id !== id));
        toast.success("Cliente eliminado con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getReservation = async (id: string | number) => {
    setIsLoading(true);
    await query
      .get(`/administration/reservation/${id}`)
      .then((resp) => setReservation(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
    setIsAvailability(false);
  };

  const exportReservationExcel = async (
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .get(`/administration/reservation${generateUrlParams({})}`)
      .then((resp) => {
        const Reservations: Reservation[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];
        Reservations.map((item) => {
          dataToExport.push({
            "No.": item.orderReceipt.reservationNumber,
            Cliente: `${item?.orderReceipt?.client?.firstName ?? ""} ${
              item?.orderReceipt?.client?.lastName ?? ""
            }`,
            Servicio: item?.name,
            Recurso: item?.resource?.code,
            "Fecha de reserva": (() => {
              const startDate = moment(item?.startDateAt);
              const endDate = moment(item?.endDateAt);
              const isSameDay = startDate.isSame(endDate, "day");
              if (isSameDay) {
                return startDate.format("DD/MM/YYYY");
              } else {
                return `${startDate.format("DD/MM/YYYY")} - ${endDate.format(
                  "DD/MM/YYYY"
                )}`;
              }
            })(),
            Duración: (() => {
              const startDate = moment(item?.startDateAt);
              const endDate = moment(item?.endDateAt);
              const durationInHours = endDate.diff(startDate, "hours");
              const durationInDays = endDate.diff(startDate, "days");
              if (durationInDays >= 1) {
                return `${durationInDays} día(s)`;
              } else {
                return `${durationInHours} hora(s)`;
              }
            })(),
            "Precio Total": formatCurrency(
              item?.priceUnitary?.amount as number,
              item?.priceUnitary?.codeCurrency
            ),
            "Fecha de creación":
              moment(item?.createdAt).format("DD/MM/YYYY") ?? " ",
            Origen: translateOrderOrigin(item?.orderReceipt?.origin),
            Estado: translateOrderState(item?.orderReceipt?.status),
            //@ts-ignore
            "Estado de pago": translateOrderStatePay(
              item?.orderReceipt?.statusPay
            ),
          });
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateStatusPay = (ids: string[] | number[], status: string) => {
    const update = allReservations.map((item) => {
      //@ts-ignore
      if (ids.includes(item?.id as number)) {
        return {
          ...item,
          orderReceipt: {
            ...item.orderReceipt,
            status,
          },
        };
      }
      return item;
    });
    setAllReservations(update);
  };

  return {
    isLoading,
    isFetching,
    isLoadingEvent,
    isChecking,
    paginate,
    reservation,
    clientOrders,
    getReservation,
    newReservation,
    editReservation,
    deleteClient,
    cancelReservation,
    exportReservationExcel,
    getAllReservations,
    allReservations,
    newTimeBlock,
    allEvents,
    editTimeBlock,
    getAllEvents,
    deletedTimeBlock,
    cancelOrder,
    chekcAvailability,
    isAvailability,
    confirmOrder,
    events,
    updateStatusPay,
  };
};

export default useServerReservation;
