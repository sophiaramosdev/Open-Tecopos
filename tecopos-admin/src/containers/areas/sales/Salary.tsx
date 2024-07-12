import {useState} from 'react';
import {  useForm, SubmitHandler } from "react-hook-form";
import { useParams } from "react-router-dom";

import { useAppSelector } from "../../../store/hooks";

import Button from "../../../components/misc/Button";
import Toggle from "../../../components/forms/Toggle";
import Input from "../../../components/forms/Input";
import useServerArea from "../../../api/useServerArea";



const Salary = () => {

    const {isFetching, updateArea} = useServerArea();

    const { business } = useAppSelector((state) => state.init);
    const { areaId } = useParams();
    const { areas } = useAppSelector((state) => state.nomenclator);

    const currentArea = areas.find((item) => item.id === Number(areaId));
  
    const { control, handleSubmit, watch} = useForm({mode:"onChange"});

    const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
      data
    ) => {

      updateArea(Number(areaId), data);
    };
    
    const [salary_fixed_toggle, setSalary_fixed_toggle] = useState(currentArea?.enableSalaryByPercent);

    //---------------------------------------------------------------------------------------
    return (
      <>
        <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
          <form onSubmit={handleSubmit(onSubmit)}>
                  
                  <div className="py-3">
                    <Input
                      type="number"
                      label="Salario Fijo"
                      name="salaryFixed"
                      control={control}
                      defaultValue={currentArea?.salaryFixed}
                    />   
                  </div>
                  
                  <div className="py-1">
                    <Toggle
                      name="enableSalaryByPercent"
                      control={control}
                      defaultValue={currentArea?.enableSalaryByPercent}
                      changeState={setSalary_fixed_toggle}
                      title="Habilitar salario por % de ventas"
                    />
                  </div>

                  {salary_fixed_toggle === true && 
                    <div>
                      <div className="py-2">
                        <Input
                          type="number"
                          label="Porciento de ventas"
                          name="salaryPercent"
                          control={control}
                          defaultValue={currentArea?.salaryPercent}
                          
                        />   
                      </div>
                      <div className="py-2">
                        <Input
                          type="number"
                          label={`Aplicar una vez que se obtenga el siguiente monto en: ${business?.costCurrency}`}
                          name="enablePercentAfter"
                          control={control}
                          defaultValue={currentArea?.enablePercentAfter }
                          rules={{/* required:"Campo requerido", */
                                  validate: (value) => value >= 0 || "Este valor debe ser mayor que cero",
                          }}
                        />   
                      </div>
                    </div>
                  }
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
      </>
    );
  };
  
  export default Salary;
  