import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import { ArrowUturnLeftIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useContext, useState } from "react";
import {
  DispatchProductContext,
  FieldProductData,
  VisualData,
} from "./ProductMovementStep";
import Modal from "../../../../../components/modals/GenericModal";
import QuantitySelector from "./QuantitySelector";
import VariationProductContainer from "./VariationProductContainer";

export default function ReceivedList() {
  const { fields, remove } = useContext(DispatchProductContext);
  const [modal, setModal] = useState<FieldProductData | null>(null);
  const [variationModal, setVariationModal] = useState<VisualData | null>(null);
  
  const products: VisualData[] = [];
  fields!.forEach((item) => {
    const idx = products.findIndex(
      (elem) => elem.id === item.stockAreaProductId
    );
    if (idx !== -1) {
      const product: VisualData = {
        ...products[idx],
        available: item.available + products[idx].available,
        quantity: item.quantity + products[idx].quantity,
        variations: [
          ...products[idx].variations,
          {
            id: item.variationId,
            available: item.available,
            name: item.variationName,
            quantity: item.quantity,
          },
        ],
      };
      products.splice(idx, 1, product);
    } else {
      products.push({
        id: item.stockAreaProductId,
        available: item.available,
        measure: item.measure,
        name: item.productName,
        quantity: item.quantity,
        variations: item.variationId
          ? [
              {
                id: item.variationId,
                name: item.variationName,
                available: item.available,
                quantity: item.quantity,
              },
            ]
          : [],
      });
    }
  });

  const removeItem = (id:number) => {
    const indexes:number[] = [];
    fields!.forEach((item, idx)=>{
      if(item.stockAreaProductId === id){
        indexes.push(idx)
      }
    });
    remove!(indexes)
   }

   const editItem = (item: VisualData) => {
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

  return (
    <>
      {products.map((item, idx) => {
        return (
          <div
            key={idx}
            className={`inline-flex w-full items-center border border-slate-200 p-5 rounded-md my-2 hover:bg-slate-50 `}
          >
            <div className="flex flex-grow flex-col">
              <span className="inline-flex justify-start items-center">
                <Button
                  color="slate"
                  icon={
                    <ArrowUturnLeftIcon className="h-5 w-5 text-slate-500" />
                  }
                  outline
                  action={() => removeItem(item.id)}
                />
                <Button
                  color="slate"
                  icon={
                    <PencilSquareIcon className="h-5 w-5 text-slate-500" />
                  }
                  outline
                  action={() => editItem(item)}
                />
              </span>
            </div>
            <div className="flex flex-col flex-shrink">
              <div className="inline-flex gap-5 justify-end">
                <p className="text-md font-semibold text-end">{item.name}</p>
                <p className="block text-sm text-slate-400 text-end">
                  {item.quantity + " " + translateMeasure(item.measure)}
                </p>
              </div>

              {item.variations.map((variation, idx) => (
                <div
                  key={idx}
                  className="inline-flex text-sm text-gray-400 pl-2 gap-5 justify-end"
                >
                  <p>{variation.name}</p>
                  <p>{`${variation.quantity} ${translateMeasure(
                    item.measure
                  )}`}</p>
                </div>
              ))}
            </div>
          </div>
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
