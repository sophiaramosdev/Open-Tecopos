import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { EditClientCtx } from "./EditOnlineClientContainer";
import Select from "../../../components/forms/Select";
import DateInput from "../../../components/forms/DateInput";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import { toast } from "react-toastify";
import Toggle from "../../../components/forms/Toggle";
const EditOnlinePersonalData = () => {
  const { handleSubmit, control } = useForm();
  const { client, editClient } = useContext(EditClientCtx);
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    editClient && editClient(client?.id, data);
  };

  const sexSelect: SelectInterface[] = [
    {
      id: "male",
      name: "Masculino",
    },
    {
      id: "female",
      name: "Femenino",
    },
    {
      id: "other",
      name: "Otro",
    },
  ];

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-96 flex flex-col gap-3 overflow-scroll scrollbar-thin scrollbar-thumb-gray-300 pr-3 px-1">
          <Input
            label="Nombre"
            name="firstName"
            control={control}
            // rules={{ required: "Campo requerido" }}
            defaultValue={client?.firstName}
          />
          <Input
            label="Apellidos"
            name="lastName"
            control={control}
            // rules={{ required: "Campo requerido" }}
            defaultValue={client?.lastName}
          />
          <Input
            label="No. de identificación"
            name="ci"
            control={control}
            defaultValue={client?.ci}
          />
          <Select
            name="sex"
            label="Sexo"
            data={sexSelect}
            defaultValue={client?.sex}
            control={control}
          />
          <AsyncComboBox
            dataQuery={{
              url: "/customer/categories/customer",
              defaultParams: { all_data: false },
            }}
            normalizeData={{ id: "id", name: "name" }}
            label="Categoría"
            name="customerCategoryId"
            control={control}
          />
          <DateInput
            label="Fecha de nacimiento"
            name="birthAt"
            control={control}
            defaultValue={client?.birthAt}
            untilToday
          />
          <TextArea
            name="legalNotes"
            label="Notas legales"
            control={control}
            defaultValue={client?.legalNotes}
          />
          <TextArea
            name="observations"
            label="Descripción"
            control={control}
            defaultValue={client?.observations}
          />
          {!client?.codeClient && (
            <Toggle
              name="codeClient"
              control={control}
              title="Asignar código de cliente"
            />
          )}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button name="Actualizar" color="slate-600" type="submit" />
        </div>
      </form>
    </>
  );
};

export default EditOnlinePersonalData;
