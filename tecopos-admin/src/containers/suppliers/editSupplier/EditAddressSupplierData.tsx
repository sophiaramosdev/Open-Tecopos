import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { SupplierInterfaces } from "../../../interfaces/ServerInterfaces";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";

interface WizzardInterface {
  isLoading: boolean;
  update: Function;
  currentSupplier: SupplierInterfaces | null;
}

const EditAddressSupplierData = ({
  isLoading,
  update,
  currentSupplier,
}: WizzardInterface) => {
  const { watch, control, handleSubmit } = useForm({ mode: "onChange" });

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    update && update(currentSupplier?.id, data);
  };

  const countryId =
    watch("address.countryId") ?? currentSupplier?.address?.country?.id;
  const provinceId =
    watch("address.provinceId") ?? currentSupplier?.address?.province?.id;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-96">
          <div className="md:grid md:grid-cols-2 md:gap-2">
            <Input
              label="Calle"
              name="address.street"
              control={control}
              defaultValue={currentSupplier?.address?.street_1}
            />
            <Input
              label="Localidad"
              name="address.locality"
              control={control}
              defaultValue={currentSupplier?.address?.city}
            />
            <AsyncComboBox
              name="address.countryId"
              dataQuery={{ url: "/public/countries" }}
              normalizeData={{ id: "id", name: "name" }}
              control={control}
              label="País"
              defaultItem={
                currentSupplier?.address.country
                  ? {
                      id: currentSupplier?.address?.country?.id,
                      name: currentSupplier?.address?.country?.name,
                    }
                  : undefined
              }
            />
            <AsyncComboBox
              name="address.provinceId"
              dataQuery={{ url: "/public/provinces" }}
              normalizeData={{ id: "id", name: "name" }}
              control={control}
              dependendValue={{ countryId }}
              label="Provincia"
              defaultItem={
                currentSupplier?.address.province
                  ? {
                      id: currentSupplier?.address?.province?.id,
                      name: currentSupplier?.address?.province?.name,
                    }
                  : undefined
              }
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
              defaultItem={
                currentSupplier?.address.municipality
                  ? {
                      id: currentSupplier?.address?.municipality?.id,
                      name: currentSupplier?.address?.municipality?.name,
                    }
                  : undefined
              }
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button
            name="Actualizar"
            color="slate-600"
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </>
  );
};

export default EditAddressSupplierData;
