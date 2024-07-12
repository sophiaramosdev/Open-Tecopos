import useServerProduct from "../../../../../api/useServerProducts";
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";
import { useEffect, useState, useContext } from "react";
import Button from "../../../../../components/misc/Button";
import SpinnerLoading from "../../../../../components/misc/SpinnerLoading";
import Modal from "../../../../../components/modals/GenericModal";
import QuantitySelector from "./QuantitySelector";
import { MovementsContext } from "./WizzardContainer";
import { getIconByMovementType } from "../../../../../utils/stylesHelpers";

interface VariationContainerInterface {
  product: Partial<ProductInterface>;
  close: Function;
}

const VariationProductContainer = ({
  product,
  close,
}: VariationContainerInterface) => {
  const { getVariation, productVariations, isFetching } = useServerProduct();
  const { fields, watch } = useContext(MovementsContext);
  const [quantityModal, setQuantityModal] = useState<{
    product: Partial<ProductInterface>;
    variation: { id: number; name: string };
    idx?: number;
  } | null>(null);
  const [search, setSearch] = useState<string|null>(null)

  const movementType = watch!("movementType");

  useEffect(() => {
    if (movementType === "ENTRY") getVariation(product?.id!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MovementIcon = getIconByMovementType(movementType);

  //Table data --------------------------------------------------------------
  const tableTitles =
    movementType === "ENTRY" ? ["", "Cantidad"] : ["", "En almacén", `${movementType === "ADJUST" ? "Ajuste" : "A mover"}`, "Disponible"];
  const tableData: DataTableInterface[] =
    (movementType === "ENTRY"
      ? productVariations.filter(item=>{
        if(search){
          return item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase());
        }else{
          return true;
        }}).map((item) => ({
          rowId: item.id,
          payload: {
            "": item.name,
            Cantidad: (
              <div className="inline-flex gap-1 items-center">
                {fields!.find((itm) => itm.variationId === item.id)?.quantity ??
                  "-"}
                <MovementIcon />
              </div>
            ),
          },
        }))
      : product.stockVariations?.filter(item=>movementType === "ADJUST" ? true : item.quantity > 0)?.map((item) => ({
          rowId: item.variationId,
          payload: {
            "": item.variation.name,
            "En almacén": item.quantity,
            [`${movementType === "ADJUST" ? "Ajuste" : "A mover"}`]: (
              <div className="inline-flex gap-1 items-center">
                {fields!.find((itm) => itm.variationId === item.variationId)?.quantity ??
                  "-"}
                <MovementIcon />
              </div>
            ),
            Disponible:movementType === "ADJUST" ? (fields!.find((itm) => itm.variationId === item.variationId)?.quantity ?? item.quantity) : item.quantity - (fields!.find((itm) => itm.variationId === item.variationId)?.quantity ?? 0)
          },
        }))) ?? [];

  const rowAction = (variationId: number) => {
    let productVariation = { ...product };
    const currentVariation = product.stockVariations?.find(
      (itm) => itm.variationId === variationId
    )
    productVariation.stockQuantity = currentVariation?.quantity;

    const idx = fields!.findIndex((itm) => itm.variationId === variationId);
    const variationName = movementType==="ENTRY" ? productVariations
      .find((itm) => itm.id === variationId)
      ?.name : currentVariation?.variation.name;

    if (idx !== -1) {
      setQuantityModal({
        product: productVariation,
        variation: { id: variationId, name: variationName! },
        idx,
      });
    } else {
      setQuantityModal({
        product: productVariation,
        variation: { id: variationId, name: variationName! },
      });
    }
  };
  //---------------------------------------------------------------------------

  if (isFetching)
    return (
      <SpinnerLoading className="flex flex-col justify-center items-center h-64" />
    );
  return (
    <div className="h-full overflow-scroll scrollbar-thin scrollbar-thumb-gray-200">
      <h3 className="text-lg py-5">Variaciones disponibles</h3>
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitles}
        rowAction={rowAction}
        searching={{action:setSearch, placeholder:"Buscar variación"}}
      />
      <div className="flex justify-end py-5">
        <Button name="Aceptar" type="button" color="slate-600" action={close} />
      </div>
      {!!quantityModal && (
        <Modal state={!!quantityModal} close={() => setQuantityModal(null)}>
          <QuantitySelector
            productData={quantityModal.product}
            close={() => setQuantityModal(null)}
            variation={quantityModal.variation}
            idx={quantityModal.idx}
          />
        </Modal>
      )}
    </div>
  );
};

export default VariationProductContainer;
