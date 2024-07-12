import Input from "../../../components/forms/Input";
import { useContext, useEffect, useState } from "react";
import TextArea from "../../../components/forms/TextArea";
import Toggle from "../../../components/forms/Toggle";
import Button from "../../../components/misc/Button";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../store/hooks";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { ResourceContext } from "../ListResource";
import AlertContainer from "../../../components/misc/AlertContainer";
import Modal from "../../../components/misc/GenericModal";

const DetailsResourceTab = () => {
  const { control, watch, unregister, handleSubmit, setValue, reset } =
    useForm();

  const {
    closeDetails,
    isFetching,
    isLoading,
    selectResource: data,
    updateResource,
    deleteResource,
  } = useContext(ResourceContext);

  const activeChildrens =
    watch("activeChildrens") ?? (data?.numberKids || 0) > 0 ? true : false;

  const showAmountOfPeople =
    watch("showAmountOfPeople") ?? data?.numberClients ?? 0 > 0 ? true : false;

  const numberKids = watch("numberKids") ?? data?.numberKids;

  const available = watch("available");
  const bookable = watch("bookable");

  useEffect(() => {
    if (!showAmountOfPeople) {
      setValue("numberAdults", 0);
      setValue("numberKids", 0);
      setValue("activeChildrens", false);
    }
  }, [showAmountOfPeople]);

  useEffect(() => {
    setValue("numberKids", 0);
  }, [activeChildrens]);

  useEffect(() => {
    return reset();
  }, []);

  const [deleteModal, setDeleteModal] = useState(false);

  const { areas } = useAppSelector((state) => state.nomenclator);
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const onSubmit = (dataForm: any) => {
    const body = {
      code: dataForm.code,
      numberAdults: dataForm.numberAdults,
      numberKids: dataForm.numberKids,
      isAvailable: dataForm.isAvailable,
      isReservable: dataForm.isReservable,
      description: dataForm.description,
      numberClients:
        Number(dataForm.numberKids) || 0 + Number(dataForm.numberAdults) || 0,
    };
    updateResource && updateResource(body, data?.id, closeDetails);
  };
  const { business } = useAppSelector((state) => state.init);
  const reservationActive =
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true";

  return (
    <>
      <form
        className="flex flex-col px-10 py-5 gap-y-3 border rounded-md mb-3"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex justify-end">
          <Button
            icon={
              <TrashIcon className="text-red-400 w-7 text-end cursor-pointer" />
            }
            action={() => setDeleteModal(true)}
            color="gray-400"
            textColor="slate-600"
            outline
          />
        </div>
        <Input
          control={control}
          name="code"
          label="Nombre"
          placeholder="Escriba..."
          defaultValue={data?.code}
          rules={{
            required: "Este campo es requerido",
            // pattern: {
            //   value: /^(?![#$%^&!@])[A-Za-z0-9#$%^&!@* \t]*[A-Za-z0-9 \t]*$/,
            //   message: "El nombre no puede comenzar con un carácter especial."
            // },
          }}
        />

        <TextArea
          control={control}
          name="description"
          label="Descripción"
          defaultValue={data?.description ?? ""}
        />

        <div className=" flex justify-between">
          <Toggle
            control={control}
            name="isAvailable"
            title="Disponible"
            defaultValue={data?.isAvailable}
          />
          {reservationActive && (
            <Toggle
              control={control}
              name="isReservable"
              title="Reservable"
              defaultValue={data?.isReservable}
            />
          )}
        </div>

        {reservationActive && (
          <section>
            <Toggle
              control={control}
              name="showAmountOfPeople"
              title="Cantidad de personas"
              defaultValue={!!data?.numberAdults}
            />

            {showAmountOfPeople && (
              <div className=" grid grid-cols-3 justify-items-center items-center  ">
                <Input
                  control={control}
                  name="numberAdults"
                  label="Adultos"
                  placeholder="Escriba..."
                  disabled={!showAmountOfPeople && !data?.numberAdults}
                  defaultValue={data?.numberAdults}
                  rules={{
                    required: "Este campo es requerido",
                  }}
                />
                <div className="mt-4">
                  <Toggle
                    control={control}
                    name="activeChildrens"
                    title="Niños"
                    disabled={!showAmountOfPeople}
                    defaultValue={(data?.numberKids || 0) > 0}
                  />
                </div>
                {activeChildrens && (
                  <Input
                    control={control}
                    name="numberKids"
                    label="Niños (0-12 años)"
                    type="number"
                    placeholder="Escriba..."
                    defaultValue={data?.numberKids}
                    rules={{
                      required: "Este campo es requerido",
                    }}
                  />
                )}
                {/* {activeChildrens && (
              <Input
                control={control}
                name="numberKids"
                label="Niños (0-12 años)"
                type="number"
                placeholder={data?.numberKids.toString()}
                defaultValue={Number(data?.numberKids)}
                rules={{
                  required: "Este campo es requerido",
                }}
              />
            )} */}
              </div>
            )}
          </section>
        )}

        <Modal close={() => setDeleteModal(false)} state={deleteModal}>
          <AlertContainer
            title={`Eliminar Recurso: ${data?.code}`}
            onAction={() =>
              deleteResource && deleteResource(data?.id, closeDetails)
            }
            onCancel={() => setDeleteModal(false)}
            text="Seguro que desea eliminar este recurso?"
            loading={isFetching}
          />
        </Modal>
        <div className="flex justify-end gap-3 py-2">
          <div className="w-72">
            <Button
              color="slate-700"
              type="submit"
              name="Actualizar"
              full
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default DetailsResourceTab;
