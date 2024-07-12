import { useContext, useEffect } from "react";
import InlineRadio from "../../../../components/forms/InlineRadio";
import Input from "../../../../components/forms/Input";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import TextArea from "../../../../components/forms/TextArea";
import Button from "../../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import { RegisterDetailsContext } from "../RegisterDetailsContainer";
import StepsComponent from "../../../../components/misc/StepsComponent";
import { RegisterContext } from "../AllRegistersList";
import Toggle from "../../../../components/forms/Toggle";

interface Props {
  close: Function;
}

export const ShippingPreBillingStep = ({ close }: Props) => {
  const { control, watch, setValue, getValues, handleSubmit } = useForm();
  const { isLoading, convertPreBillToBill } = useContext(RegisterContext);
  const { order, closeModalDetails } = useContext(RegisterDetailsContext);

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

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {
    let dataToSubmit: any = {
      pickUpInStore: data.shippingType === "pickUp" ? true : false,
      shipping: data.shipping,
      billing: data.shipping,
    };

    await convertPreBillToBill!(order!.id, dataToSubmit);
    await closeModalDetails!();
    await close();
  };

  return (
    <>
      <StepsComponent titles={["Entrega"]} current={1} />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col justify-between"
      >
        {/* row 1  */}
        <section>
          <div>
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

          <div className="min-h-[25rem]">
            {shipingWatching === "shipping" && (
              <div className="flex w-full gap-x-4 pb-4">
                <div className="flex- flex-col gap-2 w-1/2">
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
                    />
                  </div>

                  <div>
                    <Input
                      label="Teléfono"
                      name="shipping.phone"
                      control={control}
                      disabled={isPickUp}
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <Input
                      label="Correo electrónico"
                      name="shipping.email"
                      control={control}
                      disabled={isPickUp}
                      rules={{
                        required: {
                          value: !isPickUp,
                          message: "Este campo es requerido",
                        },
                      }}
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
                    />
                  </div>
                </div>

                <div className="flex- flex-col gap-2 w-1/2">
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
                    />
                  </div>

                  <div>
                    <Input
                      label="Calle secundaria"
                      name="shipping.street_2"
                      control={control}
                      disabled={isPickUp}
                    />
                  </div>

                  <div>
                    <AsyncComboBox
                      label="País (*)"
                      name="shipping.countryId"
                      control={control}
                      dataQuery={{ url: "/public/countries" }}
                      normalizeData={{ id: "id", name: "name" }}
                      disabled={isPickUp}
                      rules={{
                        required: {
                          value: !isPickUp,
                          message: "Este campo es requerido",
                        },
                      }}
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
                    />
                  </div>

                  <div>
                    <TextArea
                      label="Añadir notas"
                      name="shipping.description"
                      control={control}
                      disabled={isPickUp}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="grid grid-cols-2 gap-4">
          <div className="grid">
            <Button
              name={`Cancelar`}
              color="white"
              textColor="red-500"
              outline
              type="submit"
              action={() => close()}
              full
            />
          </div>

          <div className="grid">
            <Button
              name={`Convertir a factura`}
              color="slate-700"
              type="submit"
              full
              loading={isLoading}
              disabled={isLoading}
            />
          </div>
        </footer>
      </form>
    </>
  );
};
