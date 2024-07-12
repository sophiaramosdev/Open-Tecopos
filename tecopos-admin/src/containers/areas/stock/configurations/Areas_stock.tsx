import {  useForm, SubmitHandler } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../../store/hooks";
import useServerArea from "../../../../api/useServerArea";
import Toggle from "../../../../components/forms/Toggle";
import Button from "../../../../components/misc/Button";



const Areas_stock = () => {

    const {isFetching, updateArea} = useServerArea();
    const { areaId } = useParams();
    const { areas } = useAppSelector((state) => state.nomenclator);

    const currentArea = areas.find((item) => item.id === Number(areaId));
  
    const { control, handleSubmit} = useForm({mode:"onChange"});

    const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
      data
    ) => {

      updateArea(Number(areaId), data);
    };
    

    //---------------------------------------------------------------------------------------
    return (
      <>
        <div className="min-w-full mx-auto max-w-full " >
            <div className="min-w-full mx-auto grid max-w-full grid-cols-1 sm:rounded-lg grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3 bg-white">
              <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6">
                <form onSubmit={handleSubmit(onSubmit)}>
                                    
                  <div className="py-1">
                    <Toggle
                      name="allowDirectlyMovements"
                      control={control}
                      defaultValue={currentArea?.allowDirectlyMovements}
                      title="Permitir movimientos directos"
                    />
                  </div>

                  <div className="py-1">
                    <Toggle
                      name="productionOrderController"
                      control={control}
                      defaultValue={currentArea?.productionOrderController}
                      title="Hacer despacho a partir de órdenes de producción"
                    />
                  </div>
                  
                  <div className="pt-6">
                    <div className="max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6">
                        <div className="float-right">
                          <Button
                            color="slate-600"
                            type="submit"
                            name="Actualizar"
                            loading={isFetching}
                            disabled={isFetching}
                          />
                        </div>
                    </div>     
                  </div>
                    
                </form>
              </div>
            </div>
        </div>
      </>
    );
  };
  
  
  export default Areas_stock;
  