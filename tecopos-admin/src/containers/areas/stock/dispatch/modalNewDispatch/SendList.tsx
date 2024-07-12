import { useContext, useState } from "react";
import { ChevronDoubleRightIcon } from "@heroicons/react/24/solid";
import { translateMeasure } from "../../../../../utils/translate";
import Modal from "../../../../../components/modals/GenericModal";
import {
  DispatchProductContext,
  FieldProductData,
  VisualData,
} from "./ProductMovementStep";
import VariationProductContainer from "./VariationProductContainer";
import QuantitySelector from "./QuantitySelector";

export default function SendList() {
  const { products, fields } = useContext(DispatchProductContext);
  const [modal, setModal] = useState<FieldProductData | null>(null);
  const [variationModal, setVariationModal] = useState<VisualData | null>(null);

  //Get if available product is 0 ---------------------------------------------------------
  const lessEqualZero = (value: number | undefined) => {
    if (value === undefined) return false;
    if (value <= 0) {
      return true;
    } else {
      return false;
    }
  };
  //---------------------------------------------------------------------------------------

  //onClick product event ------------------------------------------------------------------
  const onClickProduct = (item: VisualData) => {
    if (item.variations.length !== 0) {
      setVariationModal(item);
    } else {
      const data: FieldProductData = {
        available: item.available,
        measure: item.measure,
        productName: item.name,
        stockAreaProductId: item.id,
      };
      setModal(data);
    }
  };
  //--------------------------------------------------------------------------------------

  return (
    <>
      {products!.map((item, idx) => {
        const index = fields!.findIndex(
          (elem) => elem.stockAreaProductId === item.id
        );

        const variationQuant = (varId:number)=>{
          return fields!.find(elem=>elem.variationId === varId)?.quantity
        }

        const quantity = fields!
          .filter((elem) => elem.stockAreaProductId === item.id)
          .reduce((t, v) => (v.quantity ?? 0) + t, 0);

        return (
          <button
            key={idx}
            type="button"
            className={`inline-flex w-full shadow-md items-center border border-slate-200 p-5 rounded-md my-2 ${
              index !== -1 && "ring-2 ring-slate-500"
            } ${
              lessEqualZero(item.available) ? "bg-red-50" : "hover:bg-slate-50"
            }`}
            onClick={() => index === -1 && onClickProduct(item)}
          >
            <div className="flex flex-grow flex-col">
              <p className="text-md font-semibold text-start">{item.name}</p>
              {item.variations.map((variation, idx) => (
                <div
                  key={idx}
                  className="inline-flex text-sm text-gray-400 pl-2 gap-3"
                >
                  <p>{`${variation.name} `}</p>
                  <p className={variationQuant(variation.id) ? "line-through" : ""}>{`${variation.available} ${translateMeasure(
                    item.measure
                  )}`}</p>
                  {variationQuant(variation.id) && <p>{`${variation.available - variationQuant(variation.id)} ${translateMeasure(
                    item.measure
                  )}`}</p> }
                </div>
              ))}
            </div>
            <div className="flex flex-col flex-shrink gap-y-2">
              <p
                className={`text-sm text-slate-400 ${
                  index !== -1 && "line-through"
                }`}
              >
                Disponible:{" "}
                {`${item.available} ${translateMeasure(item.measure)}`}
              </p>
              {index !== -1 && (
                <>
                  <p className={`text-sm text-slate-400`}>
                    Disponible:{" "}
                    {Math.round((item.available - (quantity ?? 0)) * 10000) /
                      10000}
                    {translateMeasure(item.measure)}
                  </p>
                  <span className="flex justify-end items-center">
                    {quantity}
                    <ChevronDoubleRightIcon className="h-5 text-slate-500" />
                  </span>
                </>
              )}
            </div>
          </button>
        );
      })}

      {modal && (
        <Modal state={!!modal} close={() => setModal(null)}>
          <QuantitySelector productData={modal} close={() => setModal(null)} />
        </Modal>
      )}
      {variationModal && (
        <Modal state={!!variationModal} close={() => setVariationModal(null)}>
          <VariationProductContainer
            product={variationModal}
            close={() => setVariationModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
