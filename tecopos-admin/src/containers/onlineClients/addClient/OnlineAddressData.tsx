import { useContext } from "react";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { AddClientCtx } from "./AddClientWizzard";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";

const OnlineAddressData = () => {
  const { control, watch, beforeStep, nextStep, getValues, trigger } = useContext(AddClientCtx);

  const next = async() =>{
    const valid = await trigger!();
    if(valid){
      nextStep!()
    }
  }

  
  return (
    <>
      <div className="h-96">
        <div className="md:grid md:grid-cols-2 md:gap-4">
        <Input
          label="Calle principal"
          name="address.street_1"
          control={control}
        />
        <Input
          label="Calle secundaria"
          name="address.street_2"
          control={control}
        />
        <Input
          label="Localidad *"
          name="address.city"
          control={control}
          //rules={{required:"Campo requerido"}}
        />
        <AsyncComboBox
          name="address.countryId"
          label="País"
          control={control}
          dataQuery={{url:"/public/countries"}}
          normalizeData={{id:"id", name:"name"}}          
        />
        <AsyncComboBox
          name="address.provinceId"
          label="Provincia"
          control={control}
          dataQuery={{url:"/public/provinces"}}
          normalizeData={{id:"id", name:"name"}}
          dependendValue={{countryId:watch!("address.countryId")??getValues!("address.countryId")}}
        />
        <AsyncComboBox
          name="address.municipalityId"
          label="Municipio"
          control={control}
          dataQuery={{url:"/public/municipalities"}}
          normalizeData={{id:"id", name:"name"}}
          dependendValue={{provinceId:watch!("address.provinceId")??getValues!("address.provinceId")}}
        />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button
          name="Atrás"
          color="indigo-600"
          textColor="indigo-600"
          action={beforeStep}
          outline
          full
        />
        <Button name="Siguiente" color="indigo-600" action={()=>next()} full />
      </div>
    </>
  );
};

export default OnlineAddressData;
