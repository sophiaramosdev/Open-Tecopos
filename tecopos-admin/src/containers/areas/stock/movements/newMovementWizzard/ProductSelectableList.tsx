import { translateMeasure } from "../../../../../utils/translate";
import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";
import ProductTypeBadge from "../../../../../components/misc/badges/ProductTypeBadge";
import EmptyList from "../../../../../components/misc/EmptyList";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import { formatCurrency } from "../../../../../utils/helpers";
import { useContext, useMemo, useState } from "react";
import { MovementsContext, SelectedProduct } from "./WizzardContainer";
import Modal from "../../../../../components/modals/GenericModal";
import VariationProductContainer from "./VariationProductContainer";
import { getIconByMovementType } from "../../../../../utils/stylesHelpers";

export default function ProductSelectableList({
  setQuantity,
}: {
  setQuantity: (product: ProductInterface) => void;
}) {
  
  const { watch, products, loading, search, fields } =
    useContext(MovementsContext);
  const movementType = watch!("movementType");

  //Variation Product Modal Selector -----------------------------------------------------------
  const [variationSelector, setVariationSelector] =
    useState<ProductInterface | null>(null);
  //--------------------------------------------------------------------------------------------

  const onClickProduct = (item: ProductInterface) => {
    if (isSelectedIndex(item) === -1) {
      if (item.type === "VARIATION") {
        setVariationSelector(item);
      } else {
        setQuantity(item);
      }
    }
  };

  const selectedProducts: ProductInterface[] = useMemo(() => {
    const selected: SelectedProduct[] = watch!("products") ?? [];
    return (
      products?.filter((item) =>
        selected.map((itm) => itm.productId).includes(item.id)
      ) ?? []
    );
  }, [watch!("products")]);

  const isSelectedIndex = (product: ProductInterface) => {
    const selected: SelectedProduct[] = watch!("products") ?? [];
    return selected.findIndex((item) => item.productId === product.id);
  };

  const lessEqualZero = (value: number | undefined) => {
    if (
      value === undefined ||
      movementType === "ENTRY" ||
      movementType === "ADJUST"
    )
      return false;
    if (value <= 0) {
      return true;
    } else {
      return false;
    }
  };

  const calculateAvailableQuant = (item: ProductInterface) => {
    const selectedQuantity = fields!.find(
      (itm) => itm.productId === item.id
    )?.quantity;
    if (movementType === "MOVEMENT" || movementType !== "VARIATION") {
      return (
        Math.round((item?.stockQuantity! - selectedQuantity) * 10000) / 10000
      );
    } else {
      return selectedQuantity;
    }
  };

  const calculateQuanToMove = (item: ProductInterface) => {
    if (item.type === "VARIATION") {
      return fields!
        .filter((itm) => itm.productId === item.id)
        ?.reduce((total, val) => total + val.quantity, 0);
    } else {
      return fields!.find((itm) => itm.productId === item.id)?.quantity;
    }
  };

  const MovementIcon = getIconByMovementType(movementType);

  if (loading) return <SpinnerLoading />;
  return (
    <>
      {(products ?? []).length === 0 ? (
        <div className="flex justify-center items-center h-56">
          <EmptyList
            title={`${
              search === null
                ? "Inserte un criterio de búsqueda"
                : "Sin productos para mostrar"
            }`}
          />
        </div>
      ) : (
        (products ?? []).map((item, idx) => (
          <button
            key={idx}
            type="button"
            className={`inline-flex w-full shadow-md items-center border border-slate-200 p-5 rounded-md my-2 ${
              isSelectedIndex(item) !== -1 && "ring-2 ring-slate-500"
            } ${
              lessEqualZero(item?.stockQuantity)
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
                    Disponible: {item?.stockQuantity}
                  </p>
                  {selectedProducts[isSelectedIndex(item)] &&
                    movementType !== "ADJUST" && (
                      <p className={`text-sm text-slate-400`}>
                        Disponible:
                        {calculateAvailableQuant(item)}
                      </p>
                    )}
                </>
              )}
              {isSelectedIndex(item) !== -1 && (
                <span className="flex justify-end items-center gap-2">
                  {calculateQuanToMove(item)}
                  {<MovementIcon />}
                </span>
              )}
            </div>
          </button>
        ))
      )}

      {!!variationSelector && (
        <Modal
          state={!!variationSelector}
          close={() => setVariationSelector(null)}
          size={movementType === "ENTRY" ? undefined : "m"}
        >
          <VariationProductContainer
            product={variationSelector!}
            close={() => setVariationSelector(null)}
          />{" "}
        </Modal>
      )}
    </>
  );
}
