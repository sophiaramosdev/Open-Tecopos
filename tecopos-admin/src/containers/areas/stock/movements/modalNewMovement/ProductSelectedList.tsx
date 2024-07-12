import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";
import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import { ArrowUturnLeftIcon, PencilIcon } from "@heroicons/react/24/outline";

interface ComponentProps {
  selected: (Partial<ProductInterface>&{quantityToMove:number})[];
  unsetSelected: Function;
  updateQuant:Function
}

export default function ProductSelectedList({ selected, unsetSelected, updateQuant }: ComponentProps) {
  return (
    <>
      {selected.map((item) => (
        <div
          key={item.id}
          className={`inline-flex w-full items-center border border-slate-200 p-5 rounded-md my-2 hover:bg-slate-50`}>
          <div className="flex flex-grow flex-col">
            <span className="flex justify-start items-center gap-2">
            <Button
              color="slate"
              icon={<ArrowUturnLeftIcon className="h-5 w-5 text-slate-500" />}
              outline  
              action={()=>unsetSelected(item.id)} />
              <Button
              color="slate"
              icon={<PencilIcon className="h-5 w-5 text-slate-500" />}
              outline  
              action={()=>updateQuant({state:true,data:{...item,quantity:item.quantityToMove}})} />
            </span>
          </div>          
          <div className="flex flex-col flex-shrink">            
            <p className="text-md font-semibold text-end">{item.name}</p>
            <p className="block text-sm text-slate-400 text-end">
              {item.quantityToMove + " " + translateMeasure(item.measure)}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
