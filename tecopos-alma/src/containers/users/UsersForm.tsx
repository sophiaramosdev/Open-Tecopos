import { useAppSelector } from "../../store/hooks";
import { useForm, SubmitHandler, FormState } from "react-hook-form";
import { TrashIcon } from "@heroicons/react/24/outline";
import { UserInterface } from "../../interfaces/ServerInterfaces";
import MultiSelect from "../../components/forms/Multiselect";
import { BasicType, SelectInterface } from "../../interfaces/LocalInterfaces";
import { useParams } from "react-router-dom";
import Input from "../../components/forms/Input";
import Button from "../../components/misc/Button";
import { validateEmail } from "../../utils/helpers";
import AsyncComboBox from "../../components/forms/AsyncCombobox";
import { useState } from "react";
import Modal from "../../components/misc/GenericModal";
import AlertContainer from "../../components/misc/AlertContainer";

interface UserFormProps {
  user?: UserInterface | null;
  userManage: {
    add?: Function;
    upd?: Function;
    del?: Function;
    isFetching: boolean;
  };
  close: Function;
  closeAll?: Function;
}

export default function UserForm({
  user,
  userManage,
  close,
  closeAll,
}: UserFormProps) {
  const { businessId } = useParams();
  const { userRoles } = useAppSelector((state) => state.nomenclator);
  const { handleSubmit, control, formState } = useForm({
    mode: "onChange",
  });

  const { isSubmitting } = formState;
  const { add, upd, del, isFetching } = userManage;

  const [delAlert, setDelAlert] = useState(false);

  const roles: SelectInterface[] =
    userRoles?.map((items) => ({ id: items.code, name: items.name })) ?? [];

  const onSubmit: SubmitHandler<BasicType> = async (data) => {
    if (businessId) data.businessId = businessId;
    !!user ? await upd!(user?.id, data, close) : await add!(data, close);
  };

  return (
    <>
      <div className="flex justify-between md:justify-center">
        <h3 className="md:text-lg text-md font-medium leading-6 text-gray-900">
          {!!user
            ? `Editar ${user.displayName ?? user.username}`
            : "Nuevo Usuario"}
        </h3>
        {user && (
          <div className="absolute top-8 left-10">
            <Button
              color="red-600"
              icon={<TrashIcon className="h-5 text-red-500" />}
              action={() => setDelAlert(true)}
              outline
            />
          </div>
        )}
      </div>

      <form
        className="space-y-8 divide-y divide-gray-300"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-1">
          <div className="pt-2">
            <div className="mt-5 flex flex-col">
              <Input
                name="displayName"
                label="Nombre completo"
                control={control}
                rules={{ required: "Campo requerido" }}
                defaultValue={user?.displayName}
              />

              {/*USERNAME */}
              <Input
                name="username"
                label="Usuario del sistema"
                control={control}
                rules={{ required: "Campo requerido" }}
                defaultValue={user?.username}
              />

              {/*EMAIL */}
              <Input
                name="email"
                label="Correo electrónico"
                control={control}
                rules={{
                  required: "Campo requerido",
                  validate: { valid: (value) => validateEmail(value) },
                }}
                defaultValue={user?.email}
              />

              {/*ROLES */}
              <MultiSelect
                label="Roles"
                name="roles"
                control={control}
                rules={{
                  required: { value: true, message: "Campo Requerido" },
                }}
                byDefault={user?.roles.map((rol) => rol.code)}
                data={roles}
              />
              {/*BUSINESS */}
              {!businessId && (
                <AsyncComboBox
                  className="py-2"
                  name="businessId"
                  label="Negocio"
                  dataQuery={{ url: "/control/business" }}
                  normalizeData={{ id: "id", name: "name" }}
                  control={control}
                  defaultItem={
                    !!user?.business
                      ? { id: user.business.id, name: user.business.name }
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <Button
              name={`${!!user ? "Actualizar" : "Insertar"}`}
              color="primary"
              type="submit"
              loading={isSubmitting && isFetching}
              disabled={isFetching}
            />
          </div>
        </div>
      </form>

      {delAlert && (
        <Modal state={delAlert} close={setDelAlert}>
          <AlertContainer
            onAction={() => del!(user?.id, closeAll)}
            onCancel={() => setDelAlert(false)}
            title={`Eliminar ${user?.displayName ?? user?.username}`}
            text="Seguro que desea continuar?"
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
}
