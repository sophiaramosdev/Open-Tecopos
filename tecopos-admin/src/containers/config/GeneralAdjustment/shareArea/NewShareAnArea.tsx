import { useForm, SubmitHandler } from "react-hook-form";

import { SelectInterface } from "../../../../interfaces/InterfacesLocal";

import ComboBox from "../../../../components/forms/Combobox";

import Button from "../../../../components/misc/Button";
import Input from "../../../../components/forms/Input";

interface NewOperationProp {
  submitAction: Function;
  loading: boolean;
  selectDataArea: SelectInterface[]
}

const NewShareAnArea = ({ submitAction, loading, selectDataArea }: NewOperationProp) => {

  const { handleSubmit, control, unregister, getValues } = useForm();
  
  const onSubmit: SubmitHandler<Record<string, string>> = (data) => { submitAction(data); }

  //--------------------------------------------------------------------------------------------

  return (

      <form onSubmit={handleSubmit(onSubmit)}>

        <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
          
            <div className="py-2">
              <ComboBox
                name="areaId"
                data={selectDataArea.map((item) => ({ id: item.id, name: item.name }))}
                label="Área *"
                control={control}
                rules={{ required: "Este campo es requerido" }}
              />
            </div>  
            <div className="py-2">
              <Input
                    label="DNI negocio *"
                    name="businessDNI"
                    control={control}
                    placeholder="Código de la cuenta"
                    rules={{ required: "Este campo es requerido" }}
                />
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

export default NewShareAnArea;
