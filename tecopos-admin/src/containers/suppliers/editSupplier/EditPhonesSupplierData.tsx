import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { SupplierInterfaces } from "../../../interfaces/ServerInterfaces";

interface WizzardInterface{
  isLoading: boolean;
  update: Function;
  currentSupplier: SupplierInterfaces | null;
  
}

const EditPhonesSupplierData = ({isLoading, update, currentSupplier}:WizzardInterface) => {

  const {control, handleSubmit} = useForm({mode:"onChange"})
  const { fields, append, remove } = useFieldArray({
    control,
    name: "phones",
  });

  useEffect(() => {
    const phones = currentSupplier?.phones.map(item=>({number:item.number, description:item.description}));
    append(phones)
    

  }, [])

  const onSubmit: SubmitHandler<BasicType> = (data) =>{

    update && update(currentSupplier?.id, data);
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-96">
          {fields.map((item, idx) => (
            <div key={item.id} className="inline-flex w-full gap-2">
              <div key={item.id} className="grid grid-cols-2 gap-2 w-full">
                <Input
                  name={`phones.${idx}.number`}
                  control={control}
                  label="Teléfono"
                  rules={{ required: "Llene los datos o elimine el campo" }}
                  textAsNumber
                />
                <Input
                  name={`phones.${idx}.description`}
                  control={control}
                  label="Descripción"
                  rules={{ required: "Llene los datos o elimine el campo" }}
                />
              </div>
              <div className="flex items-end py-2">
                <Button
                  color="red-500"
                  icon={<TrashIcon className="h-5" />}
                  action={() => remove(idx)}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end mt-5 gap-2">
            <Button
              color="slate-400"
              textColor="slate-500"
              icon={<PlusIcon className="h-5" />}
              name="Insertar"
              action={() => append({})}
              full
              outline
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
        <Button name="Actualizar" color="slate-600" type="submit" loading={isLoading} disabled={isLoading}/>
      </div>
      </form>
    </div>
  );
};

export default EditPhonesSupplierData;
