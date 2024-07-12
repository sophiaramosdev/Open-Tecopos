import { useForm, SubmitHandler } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import TextArea from "../../components/forms/TextArea";
import Button from "../../components/misc/Button";
import Input from "../../components/forms/Input";
import { SupplierInterfaces } from "../../interfaces/ServerInterfaces";

interface NewSupplierProp {
  allSuppliers: SupplierInterfaces [] | [];
  submitAction: Function;
  loading: boolean;
}

const NewSupplier = ({submitAction, loading, allSuppliers }: NewSupplierProp) => {

  const { handleSubmit, control, unregister, getValues } = useForm();

  const { fields, append, remove } = useFieldArray({ control, name: "phones"});
  
  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {submitAction(data); }

  //--------------------------------------------------------------------------------------------

  return (

      <form onSubmit={handleSubmit(onSubmit)}>

        <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
          
          <div className="h-96">
            <div className="py-2">
              <Input
                  label="Nombre *"
                  name="name"
                  control={control}
                                  
                  rules={{
                    required: "Este campo es requerido",
                    validate: (value) =>
                      !allSuppliers.some((supplier) => supplier.name === value) ||
                      "Nombre de proveedor existente",
                  }}
              />
            </div>
            <div className="py-2">
              <Input
                  label="Nombre *"
                  name="name"
                  control={control}
                                  
                  rules={{
                    required: "Este campo es requerido",
                    validate: (value) =>
                      !allSuppliers.some((supplier) => supplier.name === value) ||
                      "Nombre de proveedor existente",
                  }}
              />
            </div>

            <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
                <TextArea
                  label="Observación"
                  name="observations"
                  control={control} 
                />
            </div>
          </div>
          <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
              <Button 
                color="slate-600"
                type="submit"
                name="Registrar"
                loading={loading}
                disabled={loading}
              />
          </div>
        </div>
      </form>
  );
};

export default NewSupplier;
