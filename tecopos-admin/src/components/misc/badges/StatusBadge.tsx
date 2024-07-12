import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { translateDispatchStatus } from "../../../utils/translate";
import {
  faBan,
  faCheck,
  faHourglassStart,
} from "@fortawesome/free-solid-svg-icons";
import {
  DispatchStatus,
  ReceiptStatus,
} from "../../../interfaces/ServerInterfaces";

function classNames(...classes: (string | DispatchStatus)[]) {
  return classes.filter(Boolean)?.join(" ") ?? " ";
}

const getColorStatus = (value?: DispatchStatus | ReceiptStatus) => {
  switch (value) {
    case "ACCEPTED":
    case "DISPATCHED":
    case "BILLED":
      return "bg-green-100 text-green-800";

    case "REJECTED":
    case "CANCELLED":
      return "bg-red-100 text-red-800";

    case "CONFIRMED":
      return "bg-blue-100 text-blue-800";

    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

const getStatusIcon = (status?: DispatchStatus | ReceiptStatus) => {
  switch (status) {
    case "ACCEPTED":
    case "DISPATCHED":
    case "CONFIRMED":
    case "BILLED":
      return faCheck;

    case "REJECTED":
    case "CANCELLED":
      return faBan;

    default:
      return faHourglassStart;
  }
};

interface StatusBadgeInterface {
  status?: DispatchStatus | ReceiptStatus;
}

export const StatusBadge = ({ status }: StatusBadgeInterface) => {
  return (
    <div
      className={classNames(
        getColorStatus(status),
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm  font-medium md:mt-2 lg:mt-0"
      )}
    >
      <FontAwesomeIcon
        icon={getStatusIcon(status)}
        className={classNames(getColorStatus(status), "mr-2 align-middle")}
      />
      {translateDispatchStatus(status)}
    </div>
  );
};
