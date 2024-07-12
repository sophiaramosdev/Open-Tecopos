import { useState, useEffect, useContext } from "react";
import Checkbox from "../../../components/forms/Checkbox";
import {
  BasicNomenclator,
} from "../../../interfaces/ServerInterfaces";
import useServerArea from "../../../api/useServerArea";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Button from "../../../components/misc/Button";
import { DetailProductContext } from "../DetailProductContainer";
import { useAppSelector } from "../../../store/hooks";

//Case Addon, Service, Menu ---------------------------------------------------------------------------

const Processed = () => {
  const { getAllAreas, allAreas, isLoading } = useServerArea();
  const { product, updateProduct } = useContext(DetailProductContext);
  const [selected, setSelected] = useState<BasicNomenclator[]>([]);
  const {business} = useAppSelector(state=>state.init)

  useEffect(() => {
    business?.subscriptionPlan.code !== "FREE" &&  getAllAreas({ type: "MANUFACTURER", all_data: true });
    setSelected(product?.listProductionAreas.map((item) => item) ?? []);
  }, []);

  //Checkbox Management-----------------------------------------------------------------------------------
  const checkData: BasicNomenclator[] = [];
  allAreas?.forEach((item) =>
    checkData.push({
      id: item.id,
      name: item.name,
    })
  );

  const updateListProd = () => {
    updateProduct &&
      updateProduct(product?.id, {
        listProductionAreas: selected.map((item) => item.id),
      });
  };

  //-------------------------------------------------------------------------------------------------------
  if (isLoading)
    return (
      <div className="flex justify-center items-center border border-slate-300 rounded-md  h-[34rem]">
        <SpinnerLoading />
      </div>
    );
  return (
    <>
      <div className="border p-5 border-slate-300 rounded-md h-[34rem] overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
        <Checkbox
          data={checkData}
          selected={selected}
          setSelected={setSelected}
        />
      </div>
      <div className="flex justify-end py-4 ">
        <Button name="Actualizar" color="slate-600" action={updateListProd} />
      </div>
    </>
  );
};

export default Processed;
