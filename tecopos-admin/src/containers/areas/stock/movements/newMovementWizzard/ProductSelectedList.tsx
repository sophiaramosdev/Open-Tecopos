import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import { ArrowUturnLeftIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useContext, useState } from "react";
import { MovementsContext } from "./WizzardContainer";
import {
  ProductInterface,
  StockVariationInterface,
} from "../../../../../interfaces/ServerInterfaces";
import Modal from "../../../../../components/modals/GenericModal";
import QuantitySelector from "./QuantitySelector";
import VariationProductContainer from "./VariationProductContainer";

interface ViewProfile {
  id?: string;
  productId: number;
  productName: string;
  measure: string;
  quantity?: number;
  averageCost?: number;
  stockQuantity?: number;
  stockVariations?: StockVariationInterface[];
  variations?: {
    id: string;
    name: string;
    quantity: number;
  }[];
}

export default function ProductSelectedList() {
  const { fields, remove } = useContext(MovementsContext);

  //Normalize data for view ------------------------------------------
  const selectedProducts: ViewProfile[] = [];
  fields!.forEach((value) => {
    const index = selectedProducts.findIndex(
      (itm) => itm.productId === value.productId
    );
    if (index !== -1) {
      const selected = selectedProducts[index];
      selectedProducts.splice(index, 1, {
        ...selected,
        variations: [
          ...(selected.variations ?? []),
          { id: value.id, name: value.variationName, quantity: value.quantity },
        ],
      });
    } else {
      let selected: ViewProfile = {
        productId: value.productId,
        productName: value.productName,
        measure: value.measure,
        averageCost: value.averageCost,
        stockQuantity: value.stockQuantity,
        stockVariations: value.stockVariations,
      };
      if (value.variationId) {
        selected.variations = [
          { id: value.id, name: value.variationName, quantity: value.quantity },
        ];
      } else {
        selected.id = value.id;
        selected.quantity = value.quantity;
      }
      selectedProducts.push(selected);
    }
  });
  //------------------------------------------------------------------------

  //Product Selector Modal State --------------------------------------------------------------
  const [productSelector, setProductSelector] = useState<{
    product: Partial<ProductInterface>;
    idx: number;
  } | null>(null);
  //---------------------------------------------------------------------------------------------

  //Variation Product Modal Selector -----------------------------------------------------------
  const [variationSelector, setVariationSelector] =
    useState<Partial<ProductInterface> | null>(null);
  //--------------------------------------------------------------------------------------------

  //Remove action -----
  const removeAction = (item: ViewProfile) => {
    if (item.id) {
      remove!(fields!.findIndex((elem) => elem.id === item.id));
    } else {
      const indexes =
        fields!.map((elem, idx) => {
          if (!!item.variations!.find((itm) => itm.id === elem.id)) {
            return idx;
          } else {
            return Infinity;
          }
        }) ?? [];
      remove!(indexes);
    }
  };
  //-------------------

  //on Click action -----------------
  const clickAction = (item: ViewProfile) => {
    const product: Partial<ProductInterface> = {
      id: item.productId,
      name: item.productName,
      measure: item.measure,
      averageCost: item.averageCost,
      stockQuantity: item.stockQuantity,
      stockVariations: item.stockVariations,
    };
    if (item.id) {
      const idx = fields!.findIndex((itm) => itm.id === item.id);
      setProductSelector({ product, idx });
    } else {
      setVariationSelector(product);
    }
  };
  //---------------------------------

  return (
    <>
      {selectedProducts!.map((item, idx) => (
        <div
          key={idx}
          className={`inline-flex gap-5 w-full items-center border border-slate-200 p-5 rounded-md my-2 hover:bg-slate-50`}
        >
          <div className="flex flex-grow flex-col">
            <span className="flex justify-start items-center gap-2">
              <Button
                color="slate"
                icon={<ArrowUturnLeftIcon className="h-5 w-5 text-slate-500" />}
                outline
                action={() => removeAction(item)}
              />
              <Button
                color="slate"
                icon={<PencilIcon className="h-5 w-5 text-slate-500" />}
                outline
                action={() => clickAction(item)}
              />
            </span>
          </div>
          <div className="flex flex-col">
            <p className="text-md font-semibold text-end">{item.productName}</p>
            {item.quantity ? (
              <p className="block text-sm text-slate-400 text-end">
                {`${item.quantity} ${translateMeasure(item.measure)}`}
              </p>
            ) : (
              <div className="flex flex-col gap-y-1">
                {item?.variations?.map((elem, idx) => (
                  <p
                    key={idx}
                    className="inline-flex flex-shrink text-xs text-slate-400 gap-2 justify-between"
                  >
                    <span className="font-semibold">{elem.name}</span>
                    <span className="flex flex-shrink-0 font-semibold">{`${
                      elem.quantity
                    } ${translateMeasure(item.measure)}`}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {!!productSelector && (
        <Modal state={!!productSelector} close={() => setProductSelector(null)}>
          <QuantitySelector
            productData={productSelector.product!}
            close={() => setProductSelector(null)}
            idx={productSelector.idx}
          />
        </Modal>
      )}
      {!!variationSelector && (
        <Modal
          state={!!variationSelector}
          close={() => setVariationSelector(null)}
        >
          <VariationProductContainer
            product={variationSelector}
            close={() => setVariationSelector(null)}
          />
        </Modal>
      )}
    </>
  );
}
