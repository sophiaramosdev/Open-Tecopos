import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { translateOperation } from "../../../utils/translate";
import {
  faSignInAlt,
  faDollyBox,
  faSignOutAlt,
  faDiagramProject,
  faTrash,
  faSlidersH,
  faMinusSquare,
  faCashRegister,
  faRefresh
} from "@fortawesome/free-solid-svg-icons";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const getColorMovementsOperationType = (value?: string | null) => {
  let data = "";

  switch (value) {
    case "ENTRY":
      data = "bg-emerald-100 text-emerald-800";
      break;
    case "MOVEMENT":
      data = "bg-blue-100 text-blue-800";
      break;
    case "OUT":
      data = "bg-orange-100 text-orange-800";
      break;
    case "EXIT":
      data = "bg-red-100 text-red-800";
      break;
    case "PROCESSED":
      data = "bg-purple-100 text-purple-800";
      break;
    case "REMOVED":
      data = "bg-red-100 text-red-800";
      break;
    case "ADJUST":
      data = "bg-yellow-100 text-yellow-800";
      break;
    case "WASTE":
      data = "bg-purple-100 text-purple-800";
      break;
    case "TRANSFORMATION":
      data = "bg-slate-100 text-slate-800";
      break;
    default:
      data = "bg-fuchsia-100 text-fuchsia-800";
  }

  return data;
};

const getOperationIcon = (operation?: string | null) => {

  switch (operation) {
    case "MOVEMENT":
      return faDollyBox;

    case "OUT":
      return faSignOutAlt;

    case "EXIT":
      return faSignOutAlt;

    case "PROCESSED":
      return faDiagramProject;

    case "REMOVED":
      return faTrash;

    case "ADJUST":
      return faSlidersH;

    case "WASTE":
      return faMinusSquare;

    case "SALE":
      return faCashRegister;

    case "TRANSFORMATION":
      return faRefresh;

    default:
      return faSignInAlt;
  }
};

interface MovementBadgeInterface {
  operation?: string | null
}

const MovementsTypeBadge = ({ operation }: MovementBadgeInterface) => {
  return (
    <div
      className={classNames(
        getColorMovementsOperationType(operation),
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm  font-medium md:mt-2 lg:mt-0"
      )}
    >
      <FontAwesomeIcon
        icon={getOperationIcon(operation)}
        className={classNames(
          getColorMovementsOperationType(operation),
          "mr-2 align-middle"
        )}
      />
      {translateOperation(operation)}
    </div>
  );
};

export default MovementsTypeBadge;
