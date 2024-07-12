import React, { useEffect } from "react";
import { useContext } from "react";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import TextArea from "../../../../components/forms/TextArea";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import useServerOnlineClients from "../../../../api/useServerOnlineClients";
import InlineRadio from "../../../../components/forms/InlineRadio";
import { RegisterContext } from "../AllRegistersList";
import { EditContextBilling } from "../registerDetailsTabs/RegisterDetailsTab";
import Toggle from "../../../../components/forms/Toggle";

export const ClientDataStep = () => {
  const { helperArray, addClient,isFetching } = useServerOnlineClients();
  const {
    control,
    setValue,
    getValues,
    trigger,
    watch,
    setCurrentStep,
    currentStep,
    clearErrors,
    isLoading,
    isFetching:isFetchingUpdate
  } = useContext(RegisterContext);
  const { defaultValues, editMode } = useContext(EditContextBilling);

  const RadioValues = [
    {
      label: "Existente",
      value: "existingClient",
    },
    {
      label: "Nuevo",
      value: "newClient",
    },
  ];

  const handleNewClient = async (data: any) => {
    setValue!("clientId", data.id);
    setValue!("client", "");
    setCurrentStep!(2);
  };
  const isExistingClient = watch!("isExistingClient");
  const onSubmit = async () => {
    if (
      await trigger!([
        "client.firstName",
        "client.ci",
        "client.firstName",
        "clientId",
        "client.phones[0].number",
        "client.email",
        "client.address.street_1",
        "client.address.street_2",
        "client.address.city",
        "client.address.municipality.id",
        "client.address.province.id",
        "client.address.country.id, client.customerCategory",
      ])
    ) {
      const clientId = watch!("clientId");
      setValue!("clientId", clientId);

      if (isExistingClient === "newClient") {
        const dataClient = watch!("client");
        await addClient!(dataClient, handleNewClient);
      } else {
        setCurrentStep!(currentStep! + 1);
      }
    }
  };
  useEffect(() => {
    setValue!("isExistingClient", RadioValues[0].value);
  }, []);

  return (
    <div className="grid gap-x-16 min-h-[25rem] px-8">
      <div>
        <div className="grid">
          <div>
            <InlineRadio
              name="isExistingClient"
              data={RadioValues}
              control={control}
              defaultValue={RadioValues[0].value}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 ">
            {isExistingClient === "existingClient" && (
              <>
                <div className=" col-span-2">
                  <AsyncComboBox
                    dataQuery={{
                      url: "/customer",
                      defaultParams: { all_data: false },
                    }}
                    normalizeData={{
                      id: "id",
                      name: ["firstName", "lastName"],
                      format: "firstName lastName",
                    }}
                    label="Nombre (*)"
                    name="clientId"
                    control={control}
                    undefinedFormat=" "
                    rules={{
                      required: "Este campo es requerido",
                      onChange: (e) => clearErrors!("clientId"),
                    }}
                    defaultValue={editMode && defaultValues?.client?.id}
                  />
                </div>

                <div className="col-span-2">
                  <TextArea
                    label="Notas del cliente"
                    name="customerNotes"
                    control={control}
                    defaultValue={editMode && defaultValues?.customerNote}
                  />
                </div>

                <div className="col-span-2">
                  <Toggle
                    control={control}
                    name="sendMail"
                    title="Notificar vía correo electrónico"
                    defaultValue={editMode ? defaultValues?.sendMail : false}
                  />
                </div>
              </>
            )}
            {isExistingClient === "newClient" && (
              <>
                <div className="col-span-2">
                  <Input
                    label="Nombre (*)"
                    name="client.firstName"
                    control={control}
                    rules={{
                      required: "Este campo es requerido",
                      onChange: (e) => clearErrors!("client.firstName"),
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Input
                    label="Apellidos"
                    name="client.lastName"
                    control={control}
                    type="text"
                  />
                  <Input
                    label="No. de identificación"
                    name="client.ci"
                    control={control}
                    maxLength={15}
                    rules={{
                      maxLength: {
                        value: 15,
                        message: "Debe introducir un número menor a 15 dígitos",
                      },
                    }}
                    textAsNumber
                  />
                  <Input
                    label="Teléfono"
                    name="client.phones[0].number"
                    type="number"
                    control={control}
                    maxLength={10}
                    rules={{
                      maxLength: {
                        value: 10,
                        message: "Debe introducir un número menor a 10 dígitos",
                      },
                    }}
                    textAsNumber
                  />
                  <Input
                    label="Correo electrónico"
                    name="client.email"
                    control={control}
                    rules={{
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message:
                          "Por favor, ingrese una dirección de correo electrónico válida",
                      },
                    }}
                  />

                  <Input
                    label="No. de contrato"
                    name="client.contractNumber"
                    control={control}
                    rules={{
                      required: "Este campo es requerido",
                      onChange: (e) => clearErrors!("client.address.street_1"),
                    }}
                  />
                  <AsyncComboBox
                    dataQuery={{
                      url: "/customer/categories/customer",
                      defaultParams: { all_data: true },
                    }}
                    normalizeData={{ id: "id", name: "name" }}
                    label="Tipo de cliente"
                    name="client.customerCategoryId"
                    control={control}
                  />
                </div>

                <div>
                  <div className="grid grid-rows-5 gap-2">
                    <Input
                      label="Calle principal"
                      name="client.address.street_1"
                      control={control}
                      rules={{
                        onChange: (e) =>
                          clearErrors!("client.address.street_1"),
                      }}
                    />

                    <Input
                      label="Calle secundaria"
                      name="client.address.street_2"
                      control={control}
                    />

                    <Input
                      label="Localidad "
                      name="client.address.city"
                      control={control}
                      rules={{
                        onChange: (e) => clearErrors!("client.address.city"),
                      }}
                    />
                    <AsyncComboBox
                      label="País "
                      name="client.address.country.id"
                      control={control}
                      dataQuery={{
                        url: "/public/countries",
                        defaultParams: { search: "Cuba" },
                      }}
                      normalizeData={{ id: "id", name: "name" }}
                      defaultValue={54}
                      defaultItem={{ id: 54, name: "Cuba" }}
                      rules={{
                        onChange: (e) =>
                          clearErrors!("client.address.country.id"),
                      }}
                    />
                    <AsyncComboBox
                      name="client.address.province.id"
                      label="Provincia"
                      control={control}
                      dataQuery={{ url: "/public/provinces" }}
                      normalizeData={{ id: "id", name: "name" }}
                      dependendValue={{
                        countryId:
                          watch!("client.address.country.id") ??
                          getValues!("client.address.country.id"),
                      }}
                    />
                    <AsyncComboBox
                      name="client.address.municipality.id"
                      label="Municipio"
                      control={control}
                      dataQuery={{ url: "/public/municipalities" }}
                      normalizeData={{ id: "id", name: "name" }}
                      dependendValue={{
                        provinceId:
                          watch!("client.address.province.id") ??
                          getValues!("client.address.province.id"),
                      }}
                    />
                  </div>
                </div>

                <div className="grid col-span-2 row-span-2">
                  <TextArea
                    label="Notas legales"
                    name="client.legalNotes"
                    control={control}
                  />
                </div>

                <div className="col-span-2">
                  <TextArea
                    label="Notas del cliente"
                    name="customerNotes"
                    control={control}
                  />
                </div>

                <div className="col-span-2">
                  <Toggle
                    control={control}
                    name="sendMail"
                    title="Notificar vía correo electrónico"
                    defaultValue={editMode ? defaultValues?.sendMail : false}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex w-full row-span-2 items-end">
        {!editMode ? (
          <div className="grid grid-cols-2 w-full gap-3 pt-2">
            <Button
              name="Atrás"
              color="white"
              textColor="blue-800"
              outline
              type="button"
              action={() => {
                setCurrentStep!(currentStep! - 1);
                setValue!("client", "");
              }}
              full
              disabled={currentStep === 0 ? true : false}
            />
            <Button
              name="Continuar"
              color="slate-700"
              type="button"
              action={onSubmit}
              disabled={isFetching}
              loading={isFetching}
              full
            />
          </div>
        ) : (
          <div></div>
        )}
      </div>
      {editMode && (
        <div className="flex w-full row-span-2 items-end justify-end">
          <div className="grid">
            <Button
              name={editMode ? "Actualizar" : `Registrar`}
              color="slate-700"
              type="submit"
              full
              loading={isFetchingUpdate}
              disabled={isFetchingUpdate}
            />
          </div>
        </div>
      )}
    </div>
  );
};
