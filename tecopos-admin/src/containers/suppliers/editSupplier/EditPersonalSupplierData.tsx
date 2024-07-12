import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { SupplierInterfaces } from "../../../interfaces/ServerInterfaces";
import GenericImageDrop from "../../../components/misc/Images/GenericImageDrop";

interface WizzardInterface{
  isLoading: boolean;
  update: Function;
  currentSupplier: SupplierInterfaces | null;
}

const EditPersonalSupplierData = ({isLoading, update, currentSupplier}:WizzardInterface) => {
  
  const { control, handleSubmit } = useForm();

  const onSubmit: SubmitHandler<BasicType> = (data) =>{
    update && update(currentSupplier?.id, data);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-[27.1rem] relative">
          <div className="grid grid-cols-5 gap-3">
            <GenericImageDrop
              name="imageId"
              className="col-span-2 border border-gray-300 p-2 rounded focus:outline-none cursor-pointer"
              control={control}
              previewDefault={currentSupplier?.image?.src}
              previewHash={currentSupplier?.image?.blurHash}
            />
            <div className="border border-gray-300 p-2 rounded col-span-3">
              <div className="flex-col">
                <Input
                  label="Nombre"
                  name="name"
                  control={control}
                  rules={{ required: "Campo requerido" }}
                  defaultValue={currentSupplier?.name}
                />
                <TextArea name="observations" label="Descripción" control={control} defaultValue={currentSupplier?.observations}/>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3 absolute bottom-0 right-0">
              <Button name="Actualizar" color="slate-600" type="submit" loading={isLoading} disabled={isLoading}/>
          </div>
        </div>
      </form>
    </>
  );
};

export default EditPersonalSupplierData;
