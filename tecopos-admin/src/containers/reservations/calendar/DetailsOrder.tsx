import { FaCircle, FaPen } from "react-icons/fa";
import { FaX } from "react-icons/fa6";
import { useContext, useEffect } from "react";
import Fetching from "../../../components/misc/Fetching";
import { useAppSelector } from "../../../store/hooks";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import moment from "moment";
import { useState } from "react";
import TabNav from "../../../components/navigation/TabNav";
import  {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import useServerProduct from "../../../api/useServerProducts";
interface Props {
  close: Function;
  select: number | string;
  context: React.Context<any>;
}
const DetailsOrder = ({ close, select, context }: Props) => {
  const {
    isFetching,
    isLoading,
    reservation,
    getReservation = () => {},
    setShowEdit = () => {},
    confirmOrder,
  } = useContext(context);
  const {
    getProduct,
    product,
    isLoading: loadingProduct = true,
  } = useServerProduct();

  const [cancelModal, setCancelModal] = useState(false);


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
  }, [select]);

  // useEffect(() => {
  //   if (reservation?.productId) {
  //     const id: any = reservation?.productId;
  //     getProduct(id);
  //   }
  // }, [reservation]);

  const [currentTab, setCurrentTab] = useState<"details" | "order">("details");
  const tabs = [
    {
      name: "Detalles de la reserva",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Detalles de la order",
      href: "order",
      current: currentTab === "order",
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
          Detalles: item?.details,
        },
      });
    });
  }

  const startDateAt = moment(reservation?.startDateAt ?? "");
  const endDateAt = moment(reservation?.endDateAt) ?? "";

  const endInSomeDay =
    startDateAt.diff(endDateAt, "days") === 0
      ? endDateAt.add(1, "day").format("DD/MM/YY")
      : endDateAt.add(1, "day").format("DD/MM/YY");

  if (isLoading || loadingProduct)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <div className="min-h-[400px]">
      {isFetching && <Fetching />}
      <header>
        <h3 className="font-semibold text-center text-xl mb-4">
          Detalles de la reservación
        </h3>

        <TabNav action={setCurrentTab} tabs={tabs} />
      </header>

      <section>
       
      </section>
    </div>
  );
};

export default DetailsOrder;
