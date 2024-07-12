import React, { useContext } from "react";
import FileInput from "../../../components/forms/FileInput";
import Button from "../../../components/misc/Button";
import { ProductContext } from "../../../containers/products/newProductModal/NewWizardContainer";
import MultipleDrop from "../../../components/misc/Images/MultipleDrop";

const ProductImg = () => {
  const { control, stepDown } = useContext(ProductContext);
  return (
    <>
      <div className="h-96 border border-slate-300 rounded p-2 overflow-auto scrollbar-thin">
        <div className="w-full">
          <MultipleDrop name="images" control={control} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 py-2">
        <Button
          color="slate-500"
          action={stepDown}
          name="Atrás"
          full
          outline
          textColor="slate-600"
        />
        <Button color="slate-600" type="submit" name="Siguiente" full />
      </div>
    </>
  );
};

export default ProductImg;
