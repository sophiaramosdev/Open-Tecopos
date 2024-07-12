import React, { useState, useEffect } from "react";
import StepsComponent from "../../../../components/misc/StepsComponent";
import DetailsStepComponent from "./FinalStepComponent";
import SelectProductComponent from "./SelectProductComponent";
import {
  NewOrderInterface,
  ProductReduced,
  ProductionOrderState,
  ProductInterface,
} from "../../../../interfaces/ServerInterfaces";
import DetailStepComponent from "./DetailStepComponent";

interface WizardInterface {
  action?: Function;
  loading: boolean;
  update?: Function;
  updateData?: ProductionOrderState | null;
}

const NewProdOrderWizard = ({
  action,
  loading,
  update,
  updateData,
}: WizardInterface) => {
  const [dataToSend, setDataToSend] = useState<Record<string, any>>({});

  //Steps Component Data -------------------------------------------------------------------------
  const titles = ["Detalles", "Definir Productos", "Finalizar"];
  const [currentStep, setCurrentStep] = useState(0);
  const backAction = () => setCurrentStep(currentStep - 1);
  //------------------------------------------------------------------------------------------------

  //SelectProducts Component Data -----------------------------------------------------------------

  //Products selected to move
  const [selectedProducts, setSelectedProducts] = useState<
    (Partial<ProductInterface> & { quantityToMove: number })[]
  >([]);

  //Case update data -> Define Selected Product to pass
  const selected: (Partial<ProductInterface> & { quantityToMove: number })[] =
    [];
  useEffect(() => {
    if (updateData) {
      updateData.endProducts.map((item) =>
        selected.push({
          id: item.productId,
          name: item.name,
          quantityToMove: item.goalQuantity,
          measure: item.measure,
        })
      );
      setSelectedProducts(selected);
    }
  }, []);


  const afterDetail = (data: Record<string, string | number>) => {
    setDataToSend({ ...dataToSend, ...data });
    setCurrentStep(1);
  };

  const afterProducts = (products: ProductReduced[]) => {
    setDataToSend({ ...dataToSend, products });
    setCurrentStep(2);
  };
  //-------------------------------------------------------------------------------------------------

  //Final Step Component ---------------------------------------------------------------------------
  const defaultData = {
    observations: updateData?.productionOrder?.observations ?? "",
    openDate: updateData?.productionOrder?.openDate ?? "",
    status: updateData?.productionOrder.status ?? "",
  };

  const afterFinal = (data: { openDate: string; observations: string }) => {
    action && action({ ...dataToSend, ...data });
    update && update({ ...dataToSend, ...data });
  };
  //-------------------------------------------------------------------------
  return (
    <>
      <StepsComponent titles={titles} current={currentStep} />
      {currentStep === 0 && (
        <DetailStepComponent
          next={afterDetail}
          defaultData={{ name: updateData?.productionOrder.name||dataToSend?.name, areaId: updateData?.productionOrder?.area?.id||dataToSend?.areaId }}
        />
      )}
      {currentStep === 1 && (
        <SelectProductComponent
          back={backAction}
          after={afterProducts}
          selected={selectedProducts}
          setSelected={setSelectedProducts}
        />
      )}
      {currentStep === 2 && (
        <DetailsStepComponent
          action={afterFinal}
          backAction={backAction}
          loading={loading}
          defaultData={updateData ? defaultData : undefined}
        />
      )}
    </>
  );
};

export default NewProdOrderWizard;
