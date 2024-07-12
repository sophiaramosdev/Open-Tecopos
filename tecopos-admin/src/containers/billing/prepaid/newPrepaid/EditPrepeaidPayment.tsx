import React, { useContext, useEffect, useState } from "react";
import StepsComponent from "../../../../components/misc/StepsComponent";
import { SubmitHandler, useForm } from "react-hook-form";
import { PrepaidContext } from "../AllPrepaidList";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import TextArea from "../../../../components/forms/TextArea";
import Button from "../../../../components/misc/Button";
interface Props {
  close: Function;
  id: any;
  closeModal: Function;
  defaultDate?: any;
}
export const EditPrepaidPayment = ({
  close,
  id,
  closeModal,
  defaultDate,
}: Props) => {
  // Hooks
  const { handleSubmit, control, watch } = useForm();
  // States
  //const {isFetching,setIsFetching } = useServerBilling()
  const [isSubmit, setIsSubmit] = useState(false);

  const { setPrepaidsList, prepaidsList, editPrepaid } =
    useContext(PrepaidContext);
  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    const dataSubmit = {
      clientId: data.clientId,
      description: data.description,
    };
    setIsSubmit(true);
    //@ts-ignore
    editPrepaid(id, dataSubmit, (data: any) => {
      const update = prepaidsList.map((item: any) => {
        if (item.id === id) return data;
        return item;
      });
      //@ts-ignore
      setPrepaidsList([...update]);
    })
      .then(() => handleResetWhenClose())
      .finally(() => setIsSubmit(false));
  };

  const handleResetWhenClose = () => {
    close();
    closeModal();
  };
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-x-16 min-h-[25rem] px-8">
          <div>
            <div className="grid">
              <div className="grid grid-cols-2 gap-2 ">
                <h3 className=" font-semibold text-base">
                  Editar el cliente asociado al pago
                </h3>
                <div className="col-span-2">
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
                    defaultValue={defaultDate?.clientId}
                  />
                </div>
                <div className="col-span-2">
                  <TextArea
                    name="description"
                    control={control}
                    label="Descripción"
                    defaultValue={defaultDate.description}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full row-span-2 items-end">
            <div className="grid grid-cols-2 w-full gap-3 pt-2">
              <div className="grid">
                <Button
                  name="Cerrar"
                  color="white"
                  textColor="blue-800"
                  outline
                  type="button"
                  action={() => {
                    close();
                  }}
                  full
                />
              </div>

              <div className="grid">
                <Button
                  name="Editar"
                  color="slate-700"
                  type="submit"
                  loading={isSubmit}
                  disabled={isSubmit}
                  full
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};
