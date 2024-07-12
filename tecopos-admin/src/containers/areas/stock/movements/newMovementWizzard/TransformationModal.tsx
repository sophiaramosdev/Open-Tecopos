import { useEffect, useContext, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import ComboBox from "../../../../../components/forms/Combobox";
import Input from "../../../../../components/forms/Input";
import { translateMeasure } from "../../../../../utils/translate";
import { ChevronDoubleRightIcon } from "@heroicons/react/24/outline";
import Button from "../../../../../components/misc/Button";
import useServerProduct from "../../../../../api/useServerProducts";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import { MovementsContext } from "./WizzardContainer";
import { cleanObj } from "../../../../../utils/helpers";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";
import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";

interface Modal {
  close: Function;
}

const TransformationModal = ({ close }: Modal) => {
  const { products, append } = useContext(MovementsContext);
  const { control, getValues, watch, trigger } =
    useForm<Record<string, string | number>>();
  const [asyncProdData, setAsyncProdData] = useState<ProductInterface[]>([]);

  //View Management ----------------------------------------------------------------------------
  const baseProductId = watch("baseProductId");
  const transformedProductId = watch("transformedProductId");
  const baseProduct = products!.find((item) => item.id === baseProductId);
  const labelBaseProd =
    `${baseProduct?.name} (${translateMeasure(baseProduct?.measure)})` ?? "";
  const transformedProd: ProductInterface | undefined = useMemo(() => {
    if(asyncProdData.length!==0){
      return asyncProdData!.find((item) => item.id === transformedProductId);
    }    
  }, [asyncProdData, transformedProductId]);
  const labelTransformedProd =
    `${transformedProd?.name} (${translateMeasure(
      transformedProd?.measure
    )})` ?? "";


  //----------------------------------------------------------------------------------

  const setProduct = async () => {
    if (await trigger()) {
      const data = getValues();
      const baseProduct = products!.find(
        (itm) => itm.id === data.baseProductId
      );
      const transformedProduct = asyncProdData.find(
        (itm) => itm.id === data.transformedProductId
      );
      const transformationData = {
        baseProductId: data.baseProductId,
        baseProductName: baseProduct?.name,
        baseProductMeasure: baseProduct?.measure,
        quantityBaseProduct: data.quantityBaseProduct,
        transformedProductId: data.transformedProductId,
        transformedProductName: transformedProduct?.name,
        transformedProdudctMeasure: transformedProduct?.measure,
        quantityTransformedProduct: data.quantityTransformedProduct,
        unitaryFractionCost: data.unitaryFractionCost ?? 1,
      };
      append!(cleanObj(transformationData));
      close();
    }
  };

  const showCUT = baseProduct?.measure !== transformedProd?.measure;

  //Data for selects ---------------------------------------------------------------------------
  const baseProducts: SelectInterface[] =
    products!
      .filter((prod) =>
        ["RAW", "MANUFACTURED", "STOCK", "WASTE", "ASSET"].includes(prod.type)
      )
      .map((item) => ({
        name: item.name ?? "",
        id: item.id ?? 0,
      })) ?? [];

  //-----------------------------------------------------------------------------

  return (
    <div>
      <div className="flex gap-3 mb-10 items-top">
        <div className="flex-grow">
          <ComboBox
            label="Producto origen"
            name="baseProductId"
            data={baseProducts}
            control={control}
            rules={{ required: "Campo requerido" }}
          />
        </div>
        <ChevronDoubleRightIcon className="h-6 text-slate-500 mt-10" />
        <div className="flex-grow">
          <AsyncComboBox
            className="mt-2"
            dataQuery={{
              url: "/administration/product",
              defaultParams: {
                all_data: true,
                type: "RAW,MANUFACTURED,STOCK,WASTE,ASSET",
              },
            }}
            name="transformedProductId"
            normalizeData={{ id: "id", name: "name" }}
            control={control}
            label="Producto final"
            disabled={baseProductId === undefined}
            rules={{ required: "Campo requerido" }}
            callback={(data: ProductInterface[]) => setAsyncProdData(data)}
          />
        </div>
      </div>
      {baseProductId && transformedProductId && (
        <>
          <div className="flex gap-x-5 mt-3 border-t-2 items-end">
            <div className="flex-grow">
              <Input
                label={labelBaseProd}
                name="quantityBaseProduct"
                type="number"
                control={control}
                placeholder="Cantidad a transformar"
                rules={{
                  validate: (value) => value !== 0 || "Campo requerido",
                }}
              />
            </div>
            <ChevronDoubleRightIcon className="h-6 text-slate-500 mb-2" />
            <div className="flex-grow">
              <Input
                label={labelTransformedProd}
                name="quantityTransformedProduct"
                type="number"
                control={control}
                placeholder="Cantidad transformada"
                rules={{
                  validate: (value) => value !== 0 || "Campo requerido",
                }}
              />
            </div>
          </div>
          {showCUT && (
            <div className="flex w-full justify-center mt-5">
              <div className="inline-flex items-center gap-3">
                <span className="flex flex-shrink-0 text-md font-medium mt-5">
                  {`1 ${translateMeasure(transformedProd?.measure)} =`}
                </span>
                <Input
                  label="Costo Unitario de Transferencia (CUT)"
                  name="unitaryFractionCost"
                  type="number"
                  control={control}
                  placeholder="CUT"
                  rules={{ required: "Campo requerido" }}
                  defaultValue={1}
                />
                <p className="text-md font-medium mt-5">
                  {translateMeasure(baseProduct?.measure)}{" "}
                </p>
              </div>
            </div>
          )}
        </>
      )}
      <div className="flex justify-end p-3">
        <Button
          type="button"
          color="slate-500"
          name="Aceptar"
          action={setProduct}
        />
      </div>
    </div>
  );
};

export default TransformationModal;
