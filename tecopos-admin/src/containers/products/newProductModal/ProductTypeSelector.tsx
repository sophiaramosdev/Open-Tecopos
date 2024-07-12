import React, { useContext } from "react";
import { ProductContext } from "../../../containers/products/newProductModal/NewWizardContainer";
import { useAppSelector } from "../../../store/hooks";
import RadioGroupForm from "../../../components/forms/RadioGroup";
import { getProductTypes } from "../../../utils/stylesHelpers";


const ProductTypeSelector = () => {
  const { control, stepUp } = useContext(ProductContext);
  const { business } = useAppSelector(state => state.init);
  const availableProdTypes = business?.configurationsKey.find(item => item.key === 'type_products')?.value
  const productTypes = getProductTypes(availableProdTypes ?? "");

  return (
    <>
      <div className="h-96 border border-slate-300 rounded p-2 pr-4 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
        <RadioGroupForm
          data={productTypes}
          name="type"
          control={control}
          action={stepUp}
        />
      </div>
    </>
  );
};

export default ProductTypeSelector;
