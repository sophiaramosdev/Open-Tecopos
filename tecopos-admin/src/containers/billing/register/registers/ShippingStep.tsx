import React, { useContext, useEffect, useState } from "react";
import Button from "../../../../components/misc/Button";
import Input from "../../../../components/forms/Input";
import TextArea from "../../../../components/forms/TextArea";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import InlineRadio from "../../../../components/forms/InlineRadio";
import { RegisterContext } from "../AllRegistersList";
import { EditContextBilling } from "../registerDetailsTabs/RegisterDetailsTab";
import Toggle from "../../../../components/forms/Toggle";

export const ShippingStep = ({ onSubmitForm }: { onSubmitForm: Function }) => {
  const {
    control,
    watch,
    setCurrentStep,
    currentStep,
    setValue,
    getValues,
    isLoading,
    isSubmit,
    setSubmit,
    setOpenPayModal,
    isFetching,
  } = useContext(RegisterContext);

  const { defaultValues, editMode } = useContext(EditContextBilling);

  const [loadingHelper, setLoadingHelper] = useState(false);

  const RadioValues = [
    {
      label: "Entregada",
      value: "pickUp",
    },
    {
      label: "Programada",
      value: "shipping",
    },
  ];
  const shipingWatching = watch!("shippingType");
  const isPickUp = shipingWatching === "pickUp";

  useEffect(() => {
    setValue!("shippingType", "pickUp");
  }, []);

  return (
    <div className="grid grid-rows-7 gap-y-6 px-8">
      {/* row 1  */}
      <div>
        {/* <InlineRadio
          name="shippingType"
          data={RadioValues}
          control={control}
          defaultValue={
            editMode && defaultValues?.pickUpInStore
              ? "pickUp"
              : RadioValues[0].value
          }
        /> */}
        <Toggle
          name="shippingType"
          control={control}
          title="Programar entrega"
          changeState={(value: boolean) => {
            if (value) {
              setValue!("shippingType", "shipping");
            } else {
              setValue!("shippingType", "pickUp");
            }
          }}
          defaultValue={false}
        />
      </div>

      {/* row 2 */}
      <div className="min-h-[25rem]">
        {shipingWatching === "shipping" && (
          <div className="flex w-full gap-x-4 pb-4">
            <div className="flex flex-col gap-2 w-1/2">
              <div>
                <Input
                  label="Nombre del receptor (*)"
                  name="shipping.firstName"
                  control={control}
                  disabled={isPickUp}
                  type="textOnly"
                  rules={{
                    required: {
                      value: !isPickUp,
                      message: "Este campo es requerido",
                    },
                  }}
                  defaultValue={editMode && defaultValues?.shipping?.firstName}
                />
              </div>

              <div>
                <Input
                  label="Apellido del receptor (*)"
                  name="shipping.lastName"
                  control={control}
                  disabled={isPickUp}
                  type="textOnly"
                  rules={{
                    required: {
                      value: !isPickUp,
                      message: "Este campo es requerido",
                    },
                  }}
                  defaultValue={editMode && defaultValues?.shipping?.lastName}
                />
              </div>

              <div>
                <Input
                  label="Teléfono"
                  name="shipping.phone"
                  type="number"
                  textAsNumber
                  control={control}
                  disabled={isPickUp}
                  maxLength={10}
                  defaultValue={editMode && defaultValues?.shipping?.phone}
                />
              </div>

              <div>
                <Input
                  label="Correo electrónico"
                  name="shipping.email"
                  control={control}
                  disabled={isPickUp}
                  defaultValue={editMode && defaultValues?.shipping?.email}
                />
              </div>

              <div>
                <Input
                  label="Código postal"
                  name="shipping.postalCode"
                  control={control}
                  disabled={isPickUp}
                  type="number"
                  textAsNumber
                  maxLength={10}
                  defaultValue={editMode && defaultValues?.shipping?.postalCode}
                />
              </div>

              <div className="pt-2">
                <Input
                  label="Localidad (*)"
                  name="shipping.city"
                  control={control}
                  disabled={isPickUp}
                  rules={{
                    required: {
                      value: !isPickUp,
                      message: "Este campo es requerido",
                    },
                  }}
                  defaultValue={editMode && defaultValues?.shipping?.city}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 w-1/2">
              <div>
                <Input
                  label="Calle principal (*)"
                  name="shipping.street_1"
                  control={control}
                  disabled={isPickUp}
                  rules={{
                    required: {
                      value: !isPickUp,
                      message: "Este campo es requerido",
                    },
                  }}
                  defaultValue={editMode && defaultValues?.shipping?.street_1}
                />
              </div>

              <div>
                <Input
                  label="Calle secundaria"
                  name="shipping.street_2"
                  control={control}
                  disabled={isPickUp}
                  defaultValue={editMode && defaultValues?.shipping?.street_2}
                />
              </div>

              <div>
                <AsyncComboBox
                  label="País (*)"
                  name="shipping.countryId"
                  control={control}
                  // id : cuba
                  dataQuery={{
                    url: "/public/countries",
                    defaultParams: { id: 54 },
                  }}
                  normalizeData={{ id: "id", name: "name" }}
                  disabled={isPickUp}
                  rules={{
                    required: {
                      value: !isPickUp,
                      message: "Este campo es requerido",
                    },
                  }}
                  defaultValue={editMode && defaultValues?.shipping?.country}
                />
              </div>

              <div>
                <AsyncComboBox
                  name="shipping.provinceId"
                  label="Provincia"
                  control={control}
                  dataQuery={{ url: "/public/provinces" }}
                  normalizeData={{ id: "id", name: "name" }}
                  dependendValue={{
                    countryId:
                      watch!("shipping.countryId") ??
                      getValues!("shipping.countryId"),
                  }}
                  disabled={isPickUp}
                  defaultValue={
                    editMode && defaultValues?.shipping?.country?.id
                  }
                />
              </div>

              <div>
                <AsyncComboBox
                  name="shipping.municipalityId"
                  label="Municipio"
                  control={control}
                  dataQuery={{ url: "/public/municipalities" }}
                  normalizeData={{ id: "id", name: "name" }}
                  dependendValue={{
                    provinceId:
                      watch!("shipping.provinceId") ??
                      getValues!("shipping.provinceId"),
                  }}
                  disabled={isPickUp}
                  defaultValue={
                    editMode && defaultValues?.shipping?.municipality?.id
                  }
                />
              </div>

              <div>
                <TextArea
                  label="Añadir notas"
                  name="shipping.description"
                  control={control}
                  disabled={isPickUp}
                  defaultValue={
                    editMode && defaultValues?.shipping?.description
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
      {!editMode && (
        <div className="grid grid-cols-3 w-full gap-3 pt-2">
          <Button
            name="Atrás"
            color="white"
            textColor="blue-800"
            outline
            type="button"
            action={() => {
              setCurrentStep!(currentStep! - 1);
            }}
            full
            disabled={currentStep === 0 ? true : false}
          />
          <Button
            name="Registrar"
            color="white"
            textColor="blue-800"
            outline
            //type="submit"
            full
            loading={isSubmit && !loadingHelper}
            disabled={isSubmit}
            action={ onSubmitForm && onSubmitForm}
          />
          <Button
            name="Registrar y facturar"
            color="slate-700"
            type="submit"
            full
            loading={isSubmit && loadingHelper}
            disabled={isSubmit}
            action={() => {
              //Action para abrir el modal de pago directa,mente
              setOpenPayModal && setOpenPayModal(true);
              setLoadingHelper(true);
              onSubmitForm && onSubmitForm(true);
            }}
          />
        </div>
      )}

      {editMode && (
        <div className="flex w-full row-span-2 items-end justify-end">
          <div className="grid">
            <Button
              name={editMode ? "Actualizar" : `Registrar`}
              color="slate-700"
              type="submit"
              full
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </div>
      )}
    </div>
  );
};
