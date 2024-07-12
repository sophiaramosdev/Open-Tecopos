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
  faClock,
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
      return "bg-violet-200 text-violet-800";

    case "CANCELLED":
      return "bg-red-200 text-red-800";

    case "OVERDUE":
      return "bg-[#feccaa] text-[#9a4a12]";

    case "CREATED":
      return "bg-[#bfd7fe] text-[#1e55af]";

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

      case "CANCELLED":
        return faCancel

    case "OVERDUE":
      return faClock;

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
  showIcon?: boolean;
  onlyShowIcon?: boolean;
}

export default function OrderStatusBadge({
  status,
  showIcon = true,
  onlyShowIcon
}: OrderStatusBadge) {
  if (!status) return <></>;
  return (
    <div
      className={classNames(
        getColorStatus(status),
        "inline-flex items-center flex-shrink-0 px-2.5 py-0.5 rounded-full text-sm  font-medium md:mt-2 lg:mt-0"
      )}
    >
      {showIcon && (
        <FontAwesomeIcon
          icon={getStatusIcon(status)}
          className={classNames(getColorStatus(status), "mr-2 align-middle")}
        />
      )}
      {!onlyShowIcon && translateOrderState(status)}
    </div>
  );
}
