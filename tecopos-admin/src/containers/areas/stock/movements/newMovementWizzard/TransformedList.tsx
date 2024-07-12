import { ArrowUturnLeftIcon } from "@heroicons/react/20/solid";
import { ChevronDoubleRightIcon } from "@heroicons/react/24/outline";
import { useContext } from "react";
import Button from "../../../../../components/misc/Button";
import { MovementsContext } from "./WizzardContainer";

const TransformedList = () => {
  const {fields, remove} = useContext(MovementsContext)

  return (
    <>
      {fields!.map((item,idx) => (
        <div key={idx} className="inline-flex gap-2 border border-slate-300 rounded p-5 w-full my-1">
          <div className="flex flex-shrink items-center">
            <Button
              color="slate-500"
              icon={<ArrowUturnLeftIcon className="h-5" />}
              textColor="slate-500"
              action={()=>remove!(idx)}
              outline
            />
          </div>
          <div className="flex flex-col flex-grow items-center">
            <h2>{item.baseProductName}</h2>
            <h4>{`${item.quantityBaseProduct} ${item.baseProductMeasure}`}</h4>
          </div>
          <div className="flex flex-grow-0 items-center">
            <ChevronDoubleRightIcon className="h-8 text-slate-400" />
          </div>
          <div className="flex flex-col flex-grow items-center">
            <h2>{item.transformedProductName}</h2>
            <h4>{`${item.quantityTransformedProduct} ${item.transformedProdudctMeasure}`}</h4>
          </div>
        </div>
      ))}
    </>
  );
};

export default TransformedList;
