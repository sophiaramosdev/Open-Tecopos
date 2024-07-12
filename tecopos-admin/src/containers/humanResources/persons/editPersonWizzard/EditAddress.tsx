import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import {
  cleanObj,
} from "../../../../utils/helpers";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  PersonInterface
} from "../../../../interfaces/ServerInterfaces";
import { BasicType } from "../../../../interfaces/InterfacesLocal";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import TextArea from "../../../../components/forms/TextArea";

interface EditInterface {
  person: PersonInterface | null;
  editPerson: Function;
  isFetching: boolean;
}

const EditAddress = ({
  editPerson,
  person,
  isFetching,
}: EditInterface) => {
  const { control, handleSubmit, watch } = useForm();

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    editPerson(person?.id, cleanObj(data));
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-96 overflow-auto scrollbar-thin px-1 md:grid md:grid-cols-2 md:gap-2 pt-2 ">
        <Input
          label="Calle principal"
          name="address.street_1"
          control={control}
          defaultValue={person?.address?.street_1}
        />
        <Input
          label="Calle secundaria"
          name="address.street_2"
          control={control}
          defaultValue={person?.address?.street_2}
        />
        <Input label="Localidad" name="address.city" control={control} />
        <AsyncComboBox
          name="address.countryId"
          label="País"
          control={control}
          dataQuery={{ url: "/public/countries" }}
          normalizeData={{ id: "id", name: "name" }}
          defaultItem={person?.address?.country}
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
          defaultItem={person?.address?.province}
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
          defaultItem={person?.address?.municipality}
        />

        <div className="col-span-2">
          <TextArea
            name="address.description"
            label="Observaciones"
            control={control}
            defaultValue={person?.address?.description}
          />
        </div>
      </div>
        <div className="flex justify-end mt-5">
          <Button
            name="Actualizar"
            color="slate-600"
            type="submit"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    </>
  );
};

export default EditAddress;
