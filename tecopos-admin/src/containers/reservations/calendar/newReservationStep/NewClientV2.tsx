import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import TextArea from "../../../../components/forms/TextArea";
import Toggle from "../../../../components/forms/Toggle";
import useServerOnlineClients from "../../../../api/useServerOnlineClients";
import Button from "../../../../components/misc/Button";
import { validateEmail } from "../../../../utils/helpers";

interface Props {
  close: Function;
}

const NewClientV2 = ({ close }: Props) => {
  const { control, watch, getValues, handleSubmit } = useForm();
  const { addClient, isFetching } = useServerOnlineClients();

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    addClient!(data, close);
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "El correo electrónico no es válido";
    }
    return true;
  };

  return (
    <>
      <form className="grid  gap-4" onSubmit={handleSubmit(onSubmit)}>
        <h1 className="font-semibold text-lg text-center col-span-2">
          Agregar nuevo cliente{" "}
        </h1>

        <fieldset className="grid col-span-2 gap-y-2">
          <legend className="col-span-full font-semibold">
            Datos personales
          </legend>
          <article className="flex gap-x-5">
            <Input
              label="Nombre (*)"
              name="firstName"
              control={control}
              rules={{
                required: "Este campo es requerido",
              }}
            />
            <Input
              label="Apellidos"
              name="lastName"
              control={control}
              type="textOnly"
            />
          </article>
          <article className="grid grid-cols-2 gap-x-5">
            <Input
              label="No. de identificación"
              name="ci"
              control={control}
              type="number"
              maxLength={15}
              rules={{
                maxLength: {
                  value: 15,
                  message: "Debe introducir un número menor a 15 dígitos",
                },
              }}
              textAsNumber
            />

            <AsyncComboBox
              dataQuery={{
                url: "/customer/categories/customer",
                defaultParams: { all_data: false },
              }}
              normalizeData={{ id: "id", name: "name" }}
              label="Tipo de cliente "
              name="customerCategoryId"
              control={control}
            />
          </article>

          <article className="flex gap-x-5">
            <Input
              label="Correo electrónico (*)"
              name="email"
              control={control}
              rules={{
                required: "Este campo es requerido",
                validate: validateEmail,
              }}
            />

            <Input
              label="Teléfono (*)"
              name="phones[0].number"
              control={control}
              rules={{
                required: "Este campo es requerido",
                pattern: {
                  value: /^[0-9]+$/,
                  message: "Por favor, introduce solo números en este campo",
                },
              }}
            />
          </article>
        </fieldset>

        <fieldset className="grid col-span-2 gap-y-2">
          <legend className="col-span-full font-semibold">
            Datos de ubicación
          </legend>

          <article className="flex gap-x-5">
            <Input
              label="Calle principal (*)"
              name="address.street_1"
              control={control}
              rules={{
                required: "Este campo es requerido",
              }}
            />

            <Input
              label="Calle secundaria"
              name="address.street_2"
              control={control}
            />
          </article>

          <article className="grid grid-cols-2 gap-x-5">
            <Input
              label="Localidad (*)"
              name="address.city"
              control={control}
              rules={{
                required: "Este campo es requerido",
              }}
            />
            <AsyncComboBox
              label="País (*)"
              name="address.country.id"
              control={control}
              dataQuery={{ url: "/public/countries" }}
              normalizeData={{ id: "id", name: "name" }}
              rules={{
                required: "Este campo es requerido",
              }}
            />
          </article>

          <article className="grid grid-cols-2 gap-x-5">
            <AsyncComboBox
              name="address.province.id"
              label="Provincia"
              control={control}
              dataQuery={{ url: "/public/provinces" }}
              normalizeData={{ id: "id", name: "name" }}
              dependendValue={{
                countryId:
                  watch!("address.country.id") ??
                  getValues!("address.country.id"),
              }}
            />
            <AsyncComboBox
              name="address.municipality.id"
              label="Municipio"
              control={control}
              dataQuery={{ url: "/public/municipalities" }}
              normalizeData={{ id: "id", name: "name" }}
              dependendValue={{
                provinceId:
                  watch!("address.province.id") ??
                  getValues!("address.province.id"),
              }}
            />
          </article>
          <article className="flex gap-x-5"></article>
        </fieldset>

        {/* <div className="grid gap-2">
          <Input
            label="No. de contrato"
            name="contractNumber"
            control={control}
          />
        </div> */}

        <div className="col-span-2">
          <Button
            name="Agregar"
            color="slate-700"
            full
            type="submit"
            disabled={isFetching}
            loading={isFetching}
          />
        </div>
      </form>
    </>
  );
};

export default NewClientV2;
