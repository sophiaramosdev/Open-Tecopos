import { useContext } from "react";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import { AddClientCtx } from "./AddClientWizzard";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import { toast } from "react-toastify";

const OnlinePersonalData = () => {
  const { control, trigger, nextStep, clearErrors } = useContext(AddClientCtx);

  const nextAction = async () => {
    if (trigger) {

      const validate = await trigger("firstName");
      if (validate && nextStep) nextStep();
    }
  };

  return (
    <>
      <div className="h-auto flex flex-col gap-4">
        <Input
          label="Nombre *"
          name="firstName"
          control={control}
          rules={{ required: "Campo requerido" ,
          onChange: (e) => clearErrors!("firstName")
        }}
        />
        <Input
          label="Apellidos"
          name="lastName"
          control={control}
          rules={{ required: "Campo requerido" }}
        />
        <Input
          label="No. de identificación"
          name="ci"
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
        <TextArea name="observations" label="Descripción" control={control} />
      </div>

      <div className="flex justify-end gap-2 mt-7">
        <div className="w-1/2">
          <Button
            name="Siguiente"
            color="indigo-600"
            action={nextAction}
            full
          />
        </div>
      </div>
    </>
  );
};

export default OnlinePersonalData;
