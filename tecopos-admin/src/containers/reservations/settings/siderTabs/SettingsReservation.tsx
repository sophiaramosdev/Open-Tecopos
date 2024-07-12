import { useMemo, useState } from "react";
import Button from "../../../../components/misc/Button";
import Select from "../../../../components/forms/Select";
import { SubmitHandler, useForm } from "react-hook-form";
import Check from "../../../../components/forms/GenericCheck";
import {
  create_array_number,
  deleteUndefinedAttr,
} from "../../../../utils/helpers";
import { useAppSelector } from "../../../../store/hooks";
import useServerBusiness from "../../../../api/useServerBusiness";
import { BasicType } from "../../../../interfaces/InterfacesLocal";

const SettingsReservation = () => {
  const { control, handleSubmit, watch } = useForm();

  const { business,  user } = useAppSelector((state) => state.init);
  const { updateConfigs, isFetching, isLoading } = useServerBusiness();

  const [reservation_default, set_reservation_default] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "reservation_default"
    )?.value === "true" ?? false
  );
  const [reservation_changes, set_reservation_changes] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "reservation_changes"
    )?.value ?? 0
  );
  const [customer_reservations, set_customer_reservations] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "customer_reservations"
    )?.value ?? 0
  );

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const { reservation_default, reservation_changes, customer_reservations } =
      data;
    updateConfigs(
      deleteUndefinedAttr({
        reservation_default,
        reservation_changes,
        customer_reservations,
      })
    );
  };

  const arrayNumber = create_array_number(0, 100);
  const reservation_changes_select: any = [];
  const customer_reservations_select: any = [];
  arrayNumber.map((item) => {
    const finalText = item?.id === 1 ? "dia" : "días"
    const name = item?.id === 0 ? "Nunca" : `${item.name} ${finalText}`;
    const name2 = item?.id === 0 ? "Siempre" : `${item.name} ${finalText}`;
    reservation_changes_select.push({
      id: item.id,
      name,
    });
    customer_reservations_select.push({
      id: item.id,
      name:name2,
    });
  });

  return (
    <>
      <form
        className=" rounded-md  min-h-screen p-4 flex flex-col justify-between "
        onSubmit={handleSubmit(onSubmit)}
      >
        <section>
          <header className=" flex flex-col gap-y-3 p-5">
            <h3 className=" font-semibold text-center text-gray-700">
              Ajustes de Reservaciones
            </h3>
          </header>

          <div className="p-5 border-2 rounded-md">
            <h3 className=" font-semibold  text-gray-700 mb-5">
              Tipo de reserva
            </h3>

            <div className="flex gap-x-3">
              <Check
                value={""}
                label="Reserva"
                checked={reservation_default}
                onChange={() => {
                  set_reservation_default(!reservation_default);
                }}
              />
              <Check
                value={""}
                label="Pre-reserva"
                checked={!reservation_default}
                onChange={() => {
                  set_reservation_default(!reservation_default);
                }}
              />
            </div>
          </div>
          <div className="p-5 border-2 rounded-md mt-4 flex flex-col gap-y-6">
            <aside>
              <h3 className=" font-semibold  text-gray-700 mb-5">
                Cancelación y Reprogramación
              </h3>
              <Select
                name="reservation_changes"
                control={control}
                data={reservation_changes_select}
                label="Los clientes pueden cancelar o reprogramar sus reservas con anterioridad:"
                defaultValue={Number(reservation_changes)}
              />
            </aside>

            <aside>
              <h3 className=" font-semibold  text-gray-700 mb-5">
              Disponibilidad para reservar en línea
              </h3>
              <Select
                name="customer_reservations"
                control={control}
                data={customer_reservations_select}
                label=" Los clientes pueden reservar"
                defaultValue={Number(customer_reservations) ?? 0}
              />
            </aside>
          </div>
        </section>

        <footer className="flex justify-end  ">
          <div className="min-w-[200px]">
            <Button
              color="slate-700"
              name="Guardar"
              full
              loading={isFetching}
              disabled={isFetching}
              type="submit"
            />
          </div>
        </footer>
      </form>
    </>
  );
};

export default SettingsReservation;
