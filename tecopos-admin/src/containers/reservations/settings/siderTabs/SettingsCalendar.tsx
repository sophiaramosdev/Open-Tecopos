import { useState } from "react";
import Button from "../../../../components/misc/Button";
import Select from "../../../../components/forms/Select";
import { SubmitHandler, useForm } from "react-hook-form";

import { useAppSelector } from "../../../../store/hooks";
import { BasicType } from "../../../../interfaces/InterfacesLocal";
import useServerBusiness from "../../../../api/useServerBusiness";

const SettingsCalendar = () => {
  const { control, handleSubmit } = useForm();

  const { business } = useAppSelector((state) => state.init);
  const { updateConfigs, isFetching } = useServerBusiness();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [booking_interval, set_booking_interval] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "booking_interval"
    )?.value ?? 0
  );

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const { booking_interval } = data;
    updateConfigs({
      booking_interval: JSON.stringify(booking_interval),
    });
  };

  const createDurationsArray = () => {
    const durations: { id: number; name: string }[] = [];

    for (let i = 10; i <= 60; i += 5) {
      durations.push({
        id: i,
        name: `${i} minutos`,
      });
    }

    // for (let i = 1; i <= 3; i++) {
    //   const minutes = i * 60;
    //   const hoursText = i === 1 ? "hora" : "horas";
    //   durations.push({
    //     id: minutes,
    //     name: `${i} ${hoursText}`,
    //   });
    // }

    durations.unshift({ id: 0, name: "Nunca" });

    return durations;
  };

  const dataSelect: any = createDurationsArray();
  // arrayNumber.map((item) => {
  //   const finalText = item?.id === 1 ? "hora" : "horas"
  //   const name = item?.id === 0 ? "Nunca" : `${item.name} ${finalText}`
  //   dataSelect.push({
  //     id: item.id,
  //     name
  //   })
  // })
  return (
    <>
      <form
        className=" rounded-md  min-h-[350px] p-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <header className=" flex flex-col gap-y-3 p-5">
          <h3 className=" font-semibold text-center text-gray-700">
            Ajustes de Calendario
          </h3>
          <p className=" text-gray-400 mt-3 text-center  w-full">
            Ajuste el diseño de su calendario y el intervalo de tiempo en minutos.{" "}
          </p>
        </header>

        <div className="p-5">
          <Select
            name="booking_interval"
            control={control}
            data={dataSelect}
            label="Intervalo de tiempo del Calendario"
            defaultValue={Number(booking_interval)}
          />
        </div>

        <footer className="flex justify-end mt-80 ">
          <div className="min-w-[200px]">
            <Button
              color="slate-700"
              name="Guardar"
              full
              type="submit"
              disabled={isFetching}
              loading={isFetching}
            />
          </div>
        </footer>
      </form>
    </>
  );
};

export default SettingsCalendar;
