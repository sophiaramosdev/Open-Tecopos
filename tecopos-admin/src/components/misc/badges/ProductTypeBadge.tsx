import React, { memo } from "react";
import { translateProductTypes } from "../../../utils/translate";
import {
  FaSquare,
  FaMinusSquare,
  FaProjectDiagram,
  FaCalculator,
  FaPlus,
  FaLayerGroup,
  FaFire,
  FaThLarge,
  FaBoxes,
  FaPallet,
  FaMoneyBill,
} from "react-icons/fa";

const getColorProductType: (value?: string) => string = (value) => {
  switch (value) {
    case "RAW":
      return "bg-purple-100 text-purple-800";

    case "WASTE":
      return "bg-red-100 text-red-800";

    case "MANUFACTURED":
      return "bg-orange-100 text-orange-800";

    case "ASSET":
      return "bg-yellow-100 text-yellow-800";

    default:
      return "bg-green-100 text-green-800";
  }
};

const getProductTypeIcon: (type?: string) => React.ReactNode = (value) => {
  switch (value) {
    case "RAW":
      return <FaSquare className={getColorProductType(value)} />;

    case "WASTE":
      return <FaMinusSquare className={getColorProductType(value)} />;

    case "MANUFACTURED":
      return <FaProjectDiagram className={getColorProductType(value)} />;

    case "ASSET":
      return <FaCalculator className={getColorProductType(value)} />;

    case "ADDON":
      return <FaPlus className={getColorProductType(value)} />;

    case "STOCK":
      return <FaLayerGroup className={getColorProductType(value)} />;

    case "MENU":
      return <FaFire className={getColorProductType(value)} />;

    case "SERVICE":
      return <FaThLarge className={getColorProductType(value)} />;

    case "COMBO":
      return <FaBoxes className={getColorProductType(value)} />;

    case "VARIATION":
      return <FaPallet className={getColorProductType(value)} />;

    default:
      return <div data-tooltip-id="my-tooltip" data-tooltip-content="Listo para la venta" className="tooltip">
        <FaMoneyBill className={getColorProductType(value)} />
      </div>
    // return <FaMoneyBill className={getColorProductType(value)}/>;
  }
};

const ProductTypeBadge = memo(({ type }: { type: string }) => {
  return (
    <span
      className={`${getColorProductType(
        type
      )} inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium flex-shrink`}
    >
      {["MENU", "STOCK", "COMBO", "SERVICE", "VARIATION", "ADDON"].includes(
        type
      ) && getProductTypeIcon()}
      {getProductTypeIcon(type)}
      <span className="max-w-full">{translateProductTypes(type)}</span>

    </span>
  );
});

export default ProductTypeBadge;
