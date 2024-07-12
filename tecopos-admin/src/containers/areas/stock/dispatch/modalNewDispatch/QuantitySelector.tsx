import { useContext } from "react";
import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import Input from "../../../../../components/forms/Input";
import { useForm } from "react-hook-form";
import { DispatchProductContext, FieldProductData} from "./ProductMovementStep";

interface QuantitySelectorInterface {
  productData: FieldProductData;
  close: Function;
}

const QuantitySelector = ({
  productData,
  close,
}: QuantitySelectorInterface) => {
  const { control, trigger, getValues } = useForm();
  const { fields, append, update } = useContext(DispatchProductContext);

  const idx = productData.variationId ? fields!.findIndex(elem=>elem.variationId === productData.variationId) : fields!.findIndex(elem=>elem.stockAreaProductId === productData.stockAreaProductId);
  
  const setProduct = async () => {
    const data = getValues();
    if(await trigger()){
      let fieldData:FieldProductData = {
        stockAreaProductId:productData.stockAreaProductId,
        productName:productData.productName,
        measure:productData.measure,
        quantity:data.quantity,
        available:productData.available
      }
      if(productData.variationId && productData.variationName){
        fieldData.variationId = productData.variationId;
        fieldData.variationName = productData.variationName;
      }
      if(idx!==-1){
        update!(idx, fieldData)        
      }else{
        append!(fieldData)
      }
      close();
    }
  };

  return (
    <>
      <div className="relative pb-2">
        <Input
          label="Definir cantidad"
          name="quantity"
          control={control}
          type="number"
          placeholder={`Cantidad en ${translateMeasure(productData?.measure)}`}
          rules={{
            max: {
              value: productData.available ?? 0,
              message: "No puede mover una cantidad mayor a la disponible",
            },
            validate: {
              minVal: (value: number) => value > 0 || "Debe indicar una cantidad",
            },
          }}
          defaultValue={idx !== -1 ? fields![idx]?.quantity : undefined}
        />
      </div>
      <div className="flex justify-end py-2">
        <Button name="Aceptar" color="slate-600" action={setProduct} />
      </div>
    </>
  );
};

export default QuantitySelector;
