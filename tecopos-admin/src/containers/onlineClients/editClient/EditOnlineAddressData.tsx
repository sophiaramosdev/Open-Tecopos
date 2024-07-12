import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { EditClientCtx } from "./EditOnlineClientContainer";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";

const EditAddressData = () => {
  const { client, editClient } = useContext(EditClientCtx);
  
  const { watch, control, handleSubmit, formState } = useForm();

  const onSubmit:SubmitHandler<BasicType> = (data) =>{
    editClient && editClient(client?.id, data)
  }

  const countryId = watch("address.countryId") ?? client?.address?.country?.id ?? 54

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-96">
          <div className="md:grid md:grid-cols-2 md:gap-2">
          <Input
          label="Calle principal"
          name="address.street_1"
          control={control}
          defaultValue={client?.address?.street_1}
        />
        <Input
          label="Calle secundaria"
          name="address.street_2"
          control={control}
          defaultValue={client?.address?.street_2}
        />
        <Input
          label="Localidad"
          name="address.city"
          control={control}
          defaultValue={client?.address?.city}
        />
        <AsyncComboBox
          name="address.countryId"
          label="País"
          control={control}
          dataQuery={{url:"/public/countries"}}
          normalizeData={{id:"id", name:"name"}}
          defaultItem={client?.address?.country ? {id:client.address.country.id, name:client.address.country.name} : {id:54,name:"Cuba"}}
          defaultValue={client?.address?.country?.id}
        />
        <AsyncComboBox
          name="address.provinceId"
          label="Provincia"
          control={control}
          dataQuery={{url:"/public/provinces",defaultParams:{search:" "}}}
          normalizeData={{id:"id", name:"name"}}
          defaultItem={client?.address?.province ? {id:client.address.province.id, name:client.address.province.name} : undefined}
          //dependendValue={{countryId}}
          defaultValue={client?.address?.province?.id}
        />
        <AsyncComboBox
          name="address.municipalityId"
          label="Municipio"
          control={control}
          dataQuery={{url:"/public/municipalities"}}
          normalizeData={{id:"id", name:"name"}}
          defaultItem={client?.address?.municipality ? {id:client.address.municipality.id, name:client.address.municipality.name} : undefined}
          dependendValue={{provinceId:watch("address.provinceId")??client?.address?.province?.id}}
          defaultValue={client?.address?.municipality?.id}
        />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button name="Actualizar" color="slate-600" type="submit" disabled={!formState.isDirty}/>
        </div>
      </form>
    </>
  );
};

export default EditAddressData;
