import {
  AdjustmentsVerticalIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/solid";
import { translateMeasure } from "../../../../../utils/translate";
import {
  ProductInterface,
} from "../../../../../interfaces/ServerInterfaces";
import ProductTypeBadge from "../../../../../components/misc/badges/ProductTypeBadge";
import EmptyList from "../../../../../components/misc/EmptyList";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import { formatCurrency } from "../../../../../utils/helpers";

interface ItemList {
  data: Partial<ProductInterface>[];
  selected: (Partial<ProductInterface> & { quantityToMove: number })[];
  isSelectedIndex: Function;
  filter?: string | null;
  unselect: Function;
  movementType: string|null;
  openModalQuant: Function;
  loading?: boolean;
}

export default function ProductSelectableList({
  data,
  selected,
  isSelectedIndex,
  filter,
  movementType,
  openModalQuant,
  loading,
}: ItemList) {
  const onClickProduct = (item: Partial<ProductInterface>) => {
    if (isSelectedIndex(item) === -1) {
        openModalQuant({ state: true, data: item });
    }
  };

  const lessEqualZero = (value: number | undefined) => {
    if (value === undefined) return false;
    if (value <= 0) {
      return true;
    } else {
      return false;
    }
  };

  const oppByMovType = (currentQuant: number, newQuant: number) => {
    if (movementType === "MOVEMENT" || movementType === "OUT") {
      return Math.round((currentQuant - newQuant) * 10000) / 10000;
    } else {
      return newQuant;
    }
  };

  const iconByType = () => {
    switch (movementType) {
      case "MOVEMENT":
      case "OUT":
        return <ArrowRightOnRectangleIcon className="h-5 text-slate-500" />;
      case "ADJUST":
        return <AdjustmentsVerticalIcon className="h-5 text-slate-500" />;
      default:
        return <ArrowLeftOnRectangleIcon className="h-5 text-slate-500" />;
    }
  };

  const filteredData =
    movementType === "ENTRY"
      ? data
      : filter
      ? data.filter((item) =>
          item.name?.toLowerCase().includes(filter.toLowerCase())
        )
      : data;

  if (loading) return <SpinnerLoading />;
  return (
    <>
      {filteredData.length === 0 ? (
        <div className="flex justify-center items-center h-56">
          <EmptyList
            title={`${
              filter === null
                ? "Inserte un criterio de búsqueda"
                : "Sin productos para mostrar"
            }`}
          />
        </div>
      ) : (
        filteredData.map((item, idx) => (
          <button
            key={idx}
            className={`inline-flex w-full shadow-md items-center border border-slate-200 p-5 rounded-md my-2 ${
              isSelectedIndex(item) !== -1 && "ring-2 ring-slate-500"
            } ${
              lessEqualZero(item.totalQuantity)
                ? "bg-red-50"
                : "hover:bg-slate-50"
            }`}
            onClick={() => onClickProduct(item)}
          >
            <div className="flex flex-col flex-grow gap-1">
              <span className="self-start">
                <ProductTypeBadge type={item.type ?? ""} />
              </span>
              <p className="text-md font-semibold text-start">{item.name}</p>
              <div className="inline-flex items-center gap-5">
                <p className="block text-sm text-slate-400 text-start">
                  {translateMeasure(item.measure)}
                </p>
                {item.type === "STOCK" && (
                  <p className="block text-sm text-slate-500 text-start font-medium">
                    {item.prices &&
                      formatCurrency(
                        item?.prices.find((price) => price.isMain)?.price ?? 0,
                        item?.prices.find((price) => price.isMain)
                          ?.codeCurrency ?? ""
                      )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col flex-grow-0 gap-y-2">
              {movementType !== "ENTRY" && (
                <>
                  <p
                    className={`text-sm text-slate-400 text-end ${
                      isSelectedIndex(item) !== -1 && "line-through"
                    }`}
                  >
                    Disponible: {item.totalQuantity}
                  </p>
                  {selected[isSelectedIndex(item)] &&
                    movementType !== "ADJUST" && (
                      <>
                        <p className={`text-sm text-slate-400`}>
                          Disponible:{" "}
                          {oppByMovType(
                            item.totalQuantity ?? 0,
                            selected[isSelectedIndex(item)].quantityToMove
                          )}
                        </p>
                      </>
                    )}
                </>
              )}
              {isSelectedIndex(item) !== -1 && (
                <span className="flex justify-end items-center">
                  {selected[isSelectedIndex(item)].quantityToMove}
                  {iconByType()}
                </span>
              )}
            </div>
          </button>
        ))
      )}
    </>
  );
}
