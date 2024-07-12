import { useForm, SubmitHandler } from "react-hook-form";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import {
  AreasInterface,
  UserInterface,
} from "../../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../../store/hooks";
import { cleanObj, validateEmail } from "../../../../utils/helpers";
import MultiSelect from "../../../../components/forms/Multiselect";
import Button from "../../../../components/misc/Button";
import useServerUsers from "../../../../api/useServerUsers";
import Input from "../../../../components/forms/Input";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { useState } from "react";
import SingleRadio from "../../../../components/forms/SingleRadio";
import { toast } from "react-toastify";

interface EditRolesInterface {
  user: UserInterface | null;
  allAreas?: AreasInterface[];
  personId?: number | undefined;
  closeModal?: Function;
}

const EditUserRolesComponent = ({
  user,
  allAreas,
  personId,
  closeModal,
}: EditRolesInterface) => {
  const { editUser, isFetching, checkEmail, resetPsw, editPerson } =
    useServerUsers();

  const [value, setvalue] = useState(0);

  const { roles, areas } = useAppSelector((state) => state.nomenclator);
  const { business } = useAppSelector((state) => state.init);
  const { handleSubmit, control, watch, formState } = useForm();

  let finalAreas: AreasInterface[] | undefined = areas;
  if (business?.mode === "GROUP") finalAreas = allAreas;

  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | string[]>
  > = (data) => {
    if (user) {
      editUser(user?.id!, cleanObj(data))
    } else {
      const { createNewUser } = data;
      if (createNewUser === undefined) {
        toast.error(
          "Debe asociar un usuario. Cree uno nuevo o asigne uno existente."
        );
      } else {
        
        editPerson(personId!, cleanObj({
          ...data,
          createNewUser: createNewUser === "true" ? true : false
        }), closeModal)
      }
    }
  };

  const currentRoles =
    watch && watch("roles")
      ? watch("roles")
      : user?.roles.map((item) => item.code);
  const dataRoles: SelectInterface[] = roles.map((rol) => {
    if (["GROUP_OWNER", "OWNER"].includes(rol.code)) {
      return {
        id: rol.code,
        name: rol.name,
        disabled: true,
      };
    }

    return {
      id: rol.code,
      name: rol.name,
    };
  });

  const salesAreas: SelectInterface[] = finalAreas!
    .filter((item) => item.type === "SALE")
    .map((item) => ({
      id: item.id,
      name:
        (item.business?.name && business?.mode === "GROUP"
          ? item.business?.name + " - "
          : "") + item.name,
    }));

  const productionAreas: SelectInterface[] = finalAreas!
    .filter((item) => item.type === "MANUFACTURER")
    .map((item) => ({
      id: item.id,
      name:
        (item.business?.name && business?.mode === "GROUP"
          ? item.business?.name + " - "
          : "") + item.name,
    }));

  const stockAreas: SelectInterface[] = finalAreas!
    .filter((item) => item.type === "STOCK")
    .map((item) => ({
      id: item.id,
      name:
        (item.business?.name && business?.mode === "GROUP"
          ? item.business?.name + " - "
          : "") + item.name,
    }));

  const accessPointAreas: SelectInterface[] = finalAreas!
    .filter((item) => item.type === "ACCESSPOINT")
    .map((item) => ({
      id: item.id,
      name:
        (item.business?.name && business?.mode === "GROUP"
          ? item.business?.name + " - "
          : "") + item.name,
    }));

  const emailInputValue = watch!("email");

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        {user ? (
          <div className="flex flex-col gap-3 h-auto pt-3">
            {/* Roles */}
            <MultiSelect
              name="roles"
              data={dataRoles}
              label="Roles"
              control={control}
              byDefault={user?.roles.map((item) => item.code)}
            />
            {Array.isArray(currentRoles) &&
              currentRoles.some((value) =>
                ["MANAGER_SALES", "WEITRESS","MARKETING_SALES","MANAGER_AREA"].includes(value)
              ) && (
                <MultiSelect
                  name="allowedSalesAreas"
                  data={salesAreas}
                  label="Áreas de venta"
                  control={control}
                  byDefault={user?.allowedSalesAreas.map(item => item.id)}
                />
              )}
            {Array.isArray(currentRoles) &&
              currentRoles.includes("MANAGER_PRODUCTION") && (
                <MultiSelect
                  name="allowedManufacturerAreas"
                  data={productionAreas}
                  label="Áreas de producción"
                  control={control}
                  byDefault={user?.allowedManufacturerAreas.map(
                    (item) => item.id
                  )}
                />
              )}
            {Array.isArray(currentRoles) &&
              currentRoles.includes("MANAGER_AREA") && (
                <MultiSelect
                  name="allowedStockAreas"
                  data={stockAreas}
                  label="Almacenes"
                  control={control}
                  byDefault={user?.allowedStockAreas.map((item) => item.id)}
                />
              )}
            {Array.isArray(currentRoles) &&
              currentRoles.some((value) =>
                ["MANAGER_ACCESS_POINT"].includes(value)
              ) && (
                <MultiSelect
                  name="allowedAccessPointAreas"
                  data={accessPointAreas}
                  label="Puntos de acceso"
                  control={control}
                  byDefault={user?.allowedAccessPointAreas.map(
                    (item) => item.id
                  )}
                />
              )}

            {/* Usuario */}
            {/* //-------------------------------------------------------- */}
            <p className="font-bold mt-5">Usuario</p>
            <div className="grid grid-cols-2 gap-5">
              <Input
                name="email"
                label="Correo electrónico"
                control={control}
                rules={{
                  validate: {
                    validateEmail: (value) =>
                      validateEmail(value) || "Dirección de correo inválida",
                    checkEmail: async (value) => {
                      if (value !== "") {
                        if (formState.dirtyFields.email) {
                          return (
                            (await checkEmail(value)) ||
                            "Dirección de correo en uso"
                          );
                        } else {
                          return true;
                        }
                      }
                    },
                  },
                }}
                defaultValue={user.email}
              />
              <div className="flex items-end ">
                <Button
                  name="Restablecer contraseña"
                  color="slate-500"
                  textColor="slate-600"
                  action={() => resetPsw(watch("email") ?? user?.email ?? null)}
                  loading={isFetching}
                  disabled={isFetching}
                  outline
                  full
                />
              </div>
            </div>

            <Input
              name="password"
              label="Nueva contraseña"
              type="password"
              control={control}
            />

            <Input
              name="pinPassword"
              control={control}
              label="Nuevo PIN"
              rules={{
                maxLength: {
                  value: 6,
                  message: "El PIN no puede exceder los 6 dígitos",
                },
              }}
              textAsNumber
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
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
                  rules={
                    emailInputValue !== "" && emailInputValue !== undefined
                      ? {
                          validate: {
                            email: (value) => validateEmail(value),
                            check: async (value) => checkEmail(value),
                          },
                        }
                      : {}
                  }
                />
                <MultiSelect
                  name="roles"
                  data={dataRoles}
                  label="Roles"
                  control={control}
                  rules={{ required: "*Este campo es requerido" }}
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
                dataQuery={{
                  url: "/security/users",
                  defaultParams: {
                    all_data: true,
                    alldata: true,
                    allData: true,
                  },
                }}
                normalizeData={{
                  id: "id",
                  name: ["displayName", "username", "email"],
                }}
                control={control}
              />
            )}
          </div>
        )}

        <div className="flex justify-end mt-5">
          <Button
            name={`${!user ? "Editar" : "Actualizar"}`}
            color="slate-600"
            type="submit"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    </>
  );
};

export default EditUserRolesComponent;
