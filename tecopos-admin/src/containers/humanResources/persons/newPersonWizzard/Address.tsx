import React, { useContext } from "react";
import Input from "../../../../components/forms/Input";
import { AddPersonCtx } from "./NewPersonWizzard";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import TextArea from "../../../../components/forms/TextArea";
import Button from "../../../../components/misc/Button";

const Address = () => {
  const { watch, control, nextStep, beforeStep } =
    useContext(AddPersonCtx);

  const afterAction = async () => {
      nextStep && nextStep();
  };

  return (
    <>
      <div className="h-96 overflow-auto scrollbar-thin px-1 md:grid md:grid-cols-2 md:gap-2 ">
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
        <Input label="Localidad" name="address.city" control={control} />
        <AsyncComboBox
          name="address.countryId"
          label="País"
          control={control}
          dataQuery={{ url: "/public/countries" }}
          normalizeData={{ id: "id", name: "name" }}
          defaultItem={{id:54, name:"Cuba"}}
        />
        <AsyncComboBox
          name="address.provinceId"
          label="Provincia"
          control={control}
          dataQuery={{
            url: "/public/provinces"
          }}
          normalizeData={{ id: "id", name: "name" }}
          dependendValue={{ countryId: watch!("address.countryId") }}
        />
        <AsyncComboBox
          name="address.municipalityId"
          label="Municipio"
          control={control}
          dataQuery={{
            url: "/public/municipalities",
          }}
          normalizeData={{ id: "id", name: "name" }}
          dependendValue={{ provinceId: watch!("address.provinceId") }}
        />

        <div className="col-span-2">
          <TextArea
            name="address.description"
            label="Observaciones"
            control={control}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-5">
        <Button
          name="Atrás"
          color="slate-600"
          textColor="slate-600"
          action={beforeStep}
          outline
        />
        <Button name="Siguiente" color="slate-600" action={afterAction} />
      </div>
    </>
  );
};

export default Address;
