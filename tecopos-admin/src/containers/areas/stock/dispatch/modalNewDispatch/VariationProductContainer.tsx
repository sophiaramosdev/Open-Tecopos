import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import { useState, useContext } from "react";
import Button from "../../../../../components/misc/Button";
import Modal from "../../../../../components/modals/GenericModal";
import { DispatchProductContext, FieldProductData, VisualData } from "./ProductMovementStep";
import QuantitySelector from "./QuantitySelector";

interface VariationContainerInterface {
  product: VisualData;
  close: Function;
}

const VariationProductContainer = ({
  product,
  close,
}: VariationContainerInterface) => {
  const { fields } = useContext(DispatchProductContext);
  const [quantityModal, setQuantityModal] = useState<FieldProductData| null>(null);
  const [search, setSearch] = useState<string | null>(null);

  //Table data --------------------------------------------------------------
  const tableTitles = ["", "En almacén", "A mover", "Disponible"];
  const tableData: DataTableInterface[] =
    product.variations
      ?.filter((item) =>
        item.name.toLowerCase().includes(search?.toLocaleLowerCase() ?? "")
      )
      ?.map((item) => ({
        rowId: item.id,
        payload: {
          "": item.name,
          "En almacén": item.available,
          "A mover": (
            <div className="inline-flex gap-1 items-center">
              {fields!.find((itm) => itm.variationId === item.id)?.quantity ??
                "-"}
            </div>
          ),
          Disponible:
            (item?.available ??
            0) -
              (fields!.find((itm) => itm.variationId === item.id)?.quantity ??
                0),
        },
      })) ?? [];

  const rowAction = (variationId:number) => {
    const currentVariation = product.variations.find(elem=>elem.id === variationId)!
    const data:FieldProductData = {
      available:currentVariation.available,
      measure:product.measure,
      productName:product.name,
      stockAreaProductId:product.id,
      variationId:variationId,
      variationName:currentVariation.name
    } 
    setQuantityModal(data);    
  };
  //---------------------------------------------------------------------------

  return (
    <div className="overflow-scroll scrollbar-thin scrollbar-thumb-gray-200">
      <h3 className="text-lg py-5">Variaciones disponibles</h3>
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitles}
        rowAction={rowAction}
        searching={{ action: setSearch, placeholder: "Buscar variación" }}
      />
      <div className="flex justify-end py-5">
        <Button name="Aceptar" type="button" color="slate-600" action={close} />
      </div>
      
      {!!quantityModal && (
        <Modal
          state={!!quantityModal}
          close={() => setQuantityModal(null)}
        >
          <QuantitySelector productData={quantityModal} close={() => setQuantityModal(null)} />
        </Modal>
      )}
    </div>
  );
};

export default VariationProductContainer;
