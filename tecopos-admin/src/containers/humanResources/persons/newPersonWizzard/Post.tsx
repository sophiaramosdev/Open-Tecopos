import { useContext, useState } from "react";
import { AddPersonCtx } from "./NewPersonWizzard";
import Button from "../../../../components/misc/Button";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import SingleRadio from "../../../../components/forms/SingleRadio";
import Input from "../../../../components/forms/Input";
import { validateEmail } from "../../../../utils/helpers";
import useServerUsers from "../../../../api/useServerUsers";
import { useAppSelector } from "../../../../store/hooks";
import ComboBox from "../../../../components/forms/Combobox";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import MultiSelect from "../../../../components/forms/Multiselect";
import Select from "../../../../components/forms/Select";

const Post = () => {
  const { personCategories, personPosts, roles } = useAppSelector(
    (state) => state.nomenclator
  );

  const [value, setvalue] = useState(0)

  const { branches, business } = useAppSelector((state) => state.init);

  const { control, beforeStep, watch } = useContext(AddPersonCtx);
  const { checkEmail, isFetching } = useServerUsers();

  const emailInputValue = watch!("email")

  const dataRoles: SelectInterface[] = roles.map((item) => ({
    id: item.code,
    name: item.name,
  }));

  const branchSelector: SelectInterface[] = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
  }));

  return (
    <>
      <div className="flex flex-col gap-3 h-auto pt-3">
        {business?.mode === "GROUP" && (
          <Select
            className="w-full"
            data={branchSelector.length > 0 ? branchSelector : [{ name: business.name, id: business.id }]}
            control={control}
            name="businessId"
            label="Negocio"
            rules={{ required: "* Campo requerido" }}
          />
        )}
        <ComboBox
          data={personPosts}
          label="Cargo"
          control={control}
          name="postId"
          rules={{ required: "* Campo requerido" }}
        />
        <ComboBox
          data={personCategories}
          label="Categoría"
          control={control}
          name="personCategoryId"
        />
        <div className="flex flex-col gap-3" >
          <SingleRadio
            name="createNewUser"
            value={"true"}
            control={control}
            label="Crear nuevo usuario"
            onChangeFunction={() => setvalue(1)}
          />
          {value === 1 && (
            <>
              <Input
                name="email"
                control={control}
                label="Correo electrónico"
                rules={(emailInputValue !== "" && emailInputValue !== undefined) ? {
                  validate: {
                    email: (value) => validateEmail(value),
                    check: async (value) => checkEmail(value),
                  },
                } : {}
                }
              />
              <MultiSelect
                name="roles"
                data={dataRoles}
                label="Roles"
                control={control}
                rules={{required: "*Este campo es requerido"}}
              />
            </>

          )}
          <SingleRadio
            name="createNewUser"
            value={"false"}
            control={control}
            label="Asignar usuario existente"
            onChangeFunction={() => setvalue(2)}
          />
          {value === 2 && (
            <AsyncComboBox
              name="userId"
              dataQuery={{ url: "/security/users", defaultParams: { page: 1 } }}
              normalizeData={{
                id: "id",
                name: ["displayName", "username", "email"],
              }}
              control={control}
            />
          )}
          <SingleRadio
            name="createNewUser"
            value={"null"}
            control={control}
            label="No crear usuario"
            onChangeFunction={() => setvalue(3)}
          />
        </div>


      </div>
      <div className="grid grid-cols-2 gap-2 mt-5">
        <Button
          name="Atrás"
          color="slate-600"
          textColor="slate-700"
          action={() => beforeStep && beforeStep()}
          outline
        />
        <Button
          name="Finalizar"
          color="slate-600"
          type="submit"
          disabled={isFetching}
        />
      </div>
    </>
  );
};

export default Post;
