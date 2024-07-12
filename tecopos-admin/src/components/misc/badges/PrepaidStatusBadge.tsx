import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { translateOrderState } from "../../../utils/translate";
import {
  faClose,
  faCheck,
  faHourglassStart,
  faReplyAll,
  faTicket,
  faUsd,
  faCancel,
  faCalendarMinus,
} from "@fortawesome/free-solid-svg-icons";

function classNames(...classes: string[]) {
  return classes.filter(Boolean)?.join(" ") ?? " ";
}

const getColorStatus = (value: string | null) => {
  switch (value) {
    case "ACTIVE":
    case "COMPLETED":
    case "DELIVERED":
    case "PAID":
    case "BILLED":
      return "bg-green-100 text-green-800";

    case "CLOSED":
      return "bg-gray-200 text-gray-800";

    case "REFUNDED":
    case "CANCELLED":
    case "OVERDUE":
      return "bg-red-200 text-red-800";

    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return faCheck;

    case "CLOSED":
      return faClose;

    case "OVERDUE":
    case "CANCELLED":
      return faCancel;

    case "IN_PROCESS":
    case "WAITING":
      return faHourglassStart;

    case "REFUNDED":
      return faReplyAll;

    case "PAYMENT_PENDING":
      return faTicket;

    case "BILLED":
      return faUsd;

    case "OVERDUE":
      return faCalendarMinus;

    default:
      return faCheck;
  }
};

interface OrderStatusBadge {
  status?: string;
}

export default function PrepaidStatusBadge({ status }: OrderStatusBadge) {
  if (!status) return <></>;
  return (
    <div
      className={classNames(
        getColorStatus(status),
        "inline-flex items-center flex-shrink-0 px-2.5 py-0.5 rounded-full text-sm  font-medium md:mt-2 lg:mt-0"
      )}
    >
      <FontAwesomeIcon
        icon={getStatusIcon(status)}
        className={classNames(getColorStatus(status), "mr-2 align-middle")}
      />
      {translatePrepaidState(status)}
    </div>
  );
}

export const translatePrepaidState = (status: string | null) => {
  switch (status) {
    case "REFUNDED":
      return "Reintegrado";

    case "PAID":
      return "Depositado";

    case "USED":
      return "Aplicado";

    default:
      return "";
  }
};
