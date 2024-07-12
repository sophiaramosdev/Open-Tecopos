import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Button from "../../../components/misc/Button";
import { DetailProductContext } from "../DetailProductContainer";
import TextArea from "../../../components/forms/TextArea";
import { SubmitHandler, useForm } from "react-hook-form";
import { useState, useContext, useEffect } from "react";
import useServerProduct from "../../../api/useServerProducts";
import {
  BasicNomenclator,
  ProductInterface,
} from "../../../interfaces/ServerInterfaces";
import Checkbox from "../../../components/forms/Checkbox";
import GenericTable from "../../../components/misc/GenericTable";

interface Addon {
  product: ProductInterface | null;
}

const Addon = () => {
  const { getAllProducts, allProducts, outLoading } = useServerProduct();
  const { product, updateProduct } = useContext(DetailProductContext);
  const [selected, setSelected] = useState<BasicNomenclator[]>([]);

  useEffect(() => {
    getAllProducts({ type: "ADDON", all_data: true });
    setSelected(product?.availableAddons.map((item) => item) ?? []);
  }, []);

  //Checkbox Management-----------------------------------------------------------------------------------
  const checkData: BasicNomenclator[] = [];
  allProducts.map((item) =>
    checkData.push({
      id: item.id,
      name: item.name,
    })
  );

  //-------------------------------------------------------------------------------------------------------

  const { control, handleSubmit } = useForm();

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    const { elaborationSteps } = data;

    updateProduct &&
      updateProduct(product?.id, {
        availableAddons: selected.map((item) => item.id),
        elaborationSteps,
      });
  };

  if (outLoading)
    return (
      <div className="h-[34rem]">
        <SpinnerLoading />
      </div>
    );
  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col items-stretch h-full"
      >
        <div className="border border-slate-300 rounded-md p-5 h-[34rem] overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
          {/* <GenericTable
            tableData={[]}
            tableTitles={tableTitle}
            actions={costActions}
            rowAction={() => {}}
          /> */}
          <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
            <TextArea
              name="elaborationSteps"
              control={control}
              label="Pasos de elaboración"
              defaultValue={product?.elaborationSteps}
            />
          </div>

          <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
            <Checkbox
              data={checkData}
              selected={selected}
              setSelected={setSelected}
            />
          </div>

          <div className="flex justify-end py-2 ">
            <Button name="Actualizar" color="slate-600" type="submit" />
          </div>
        </div>
      </form>
    </>
  );
};

export default Addon;
