import { filter } from "lodash";
import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import ComboBox from "../../../../components/forms/Combobox";
import Input from "../../../../components/forms/Input";
import MultiSelect from "../../../../components/forms/Multiselect";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import Button from "../../../../components/misc/Button";


export interface FilterComponentInterface {
  name: string;
  format: "select" | "multiselect";
  filterCode: string;
  data: SelectInterface[];
}

interface FilterContainerProps {
  selectedFilter: number[];
  submit: Function; 
  availableFilters: FilterComponentInterface[];
}

const FilterContainer = ({ availableFilters,selectedFilter, submit }: FilterContainerProps) => {
  const { handleSubmit, control, unregister} = useForm();
  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    let toSend: Record<string, string | number | boolean> = {};
 
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        toSend[key] = value.join(",");
      } else {
        toSend[key] = value;
      }
    }
    submit(toSend);

  };

  useEffect(() => {
    availableFilters.map((item, idx)=>{
      if(!selectedFilter.includes(idx))unregister(item.filterCode)
    })                
    
  }, [selectedFilter])
  

  return (
    <div className={`border border-gray-200 bg-gray-50 rounded-lg my-2 shadow-md px-5 py-2 w-full`} >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex gap-2 items-center justify-between"
      >
        <div className="flex gap-3 flex-grow w-full">
          {availableFilters.map((item, idx) =>
          selectedFilter.includes(idx) && (
            item.format === "select" ? (
              <ComboBox
                key={idx}
                name={item.filterCode}
                control={control}
                data={item.data}
                label={item.name}
                rules={{ required: "Seleccione" }}
              />
            ) : (
              item.format === "multiselect" && (
                <div key={idx} className="w-48 min-w-max">
                  <MultiSelect                  
                  name={item.filterCode}
                  control={control}
                  data={item.data}
                  label={item.name}
                  rules={{ required: "Seleccione" }}
                />
                </div>
                
              ))
            )
              )}
        </div>
        <div>
          <Button name="Aplicar" color="slate-600" type="submit" />
        </div>
      </form>
    </div>
  );
};

export default FilterContainer;
