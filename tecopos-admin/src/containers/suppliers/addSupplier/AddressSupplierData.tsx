import { useContext } from "react";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { AddSupplierCtx } from "./AddSupplierWizzard";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";

const AddressSupplierData = () => {
  const { control, beforeStep, nextStep, watch } = useContext(AddSupplierCtx);

  const countryId = watch!("address.countryId");
  const provinceId = watch!("address.provinceId");

  return (
    <>
      <div className="h-96">
        <div className="flex flex-col md:grid md:grid-cols-2 items-center gap-2">
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
            label="Ciudad / Localidad"
            name="address.city"
            control={control}
          />
          <AsyncComboBox
            name="address.countryId"
            label="País"
            control={control}
            dataQuery={{ url: "/public/countries" }}
            normalizeData={{ id: "id", name: "name" }}
          />
          <AsyncComboBox
            name="address.provinceId"
            dataQuery={{ url: "/public/provinces" }}
            normalizeData={{ id: "id", name: "name" }}
            control={control}
            dependendValue={{countryId}}
            label="Provincia"
          />
          <AsyncComboBox
            name="address.municipalityId"
            dataQuery={{
              url: "/public/municipalities",
            }}
            normalizeData={{ id: "id", name: "name" }}
            dependendValue={{ provinceId }}
            control={control}
            label="Municipio"
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
        <Button name="Siguiente" color="indigo-600" action={nextStep} full />
      </div>
    </>
  );
};

export default AddressSupplierData;
