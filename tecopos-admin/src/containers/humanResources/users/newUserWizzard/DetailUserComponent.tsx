import { useContext, useEffect, useState } from "react";
import { AddUserCtx } from "./NewUserWizzard";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import { validateEmail, validateUserChar } from "../../../../utils/helpers";
import Toggle from "../../../../components/forms/Toggle";
import GenericImageDrop from "../../../../components/misc/Images/GenericImageDrop";
import useServerUsers from "../../../../api/useServerUsers";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const DetailUserComponent = () => {

  const [viewPasw, setViewPasw] = useState(false);
  const [viewPin, setViewPin] = useState(false);

  const { watch, control, nextStep, beforeStep, trigger, unregister } =
    useContext(AddUserCtx);
  const { checkEmail, isFetching: fetchingEmail } = useServerUsers();
  const { checkUser, isFetching: fetchingUser } = useServerUsers();

  const userType = watch && watch("type");

  useEffect(() => {
    if (userType !== "manager" && unregister) {
      unregister(["email", "password", "sendMail"]);
    }
  }, []);

  const afterAction = async () => {
    if (trigger && (await trigger())) {
      nextStep && nextStep();
    }
  };

  return (
    <>
      <div className="h-96 overflow-auto scrollbar-thin px-1 flex flex-col gap-y-3">
        <GenericImageDrop
          className="h-40 w-40 rounded-full border border-gray-400 m-auto"
          control={control}
          name="avatarId"
        />
        <Input
          name="displayName"
          label="Nombre completo"
          control={control}
          rules={{ required: "Campo requerido" }}
        />
        <Input
          name="username"
          label="Usuario"
          control={control}
          rules={{
            required: "Campo requerido",
            validate: {
              validateChar: (value) => validateUserChar(value) || "El usuario no puede contener espacios ni caracteres especiales excepto - _ .",
              checkUser: async (value) => await checkUser(value) || "Nombre de usuario en uso"
            }
          }}
        />
        {userType === "manager" && (
          <>
            <Input
              name="email"
              label="Correo electrónico"
              control={control}
              rules={{
                required: "Campo requerido",
                validate: {
                  validEmail: (value) => validateEmail(value) || "Dirección de correo inválida",
                  checkEmail: async (value) => await checkEmail(value) || "Dirección de correo en uso"
                },
              }}
            />
            <div className="relative">
              <Input
                name="password"
                label="Contraseña"
                control={control}
                rules={{ required: true }}
                type={viewPasw ? "text" : "password"}
              />
              {!viewPasw ? (
                <EyeIcon
                  className="absolute top-8 right-2 h-5 text-gray-700 hover:cursor-pointer"
                  onClick={() => setViewPasw(!viewPasw)}
                />
              ) : (
                <EyeSlashIcon
                  className="absolute top-8 right-2 h-5 text-gray-700 hover:cursor-pointer"
                  onClick={() => setViewPasw(!viewPasw)}
                />
              )}
            </div>
          </>
        )}
        <div className="relative">
          <Input
            name="pinPassword"
            label="PIN"
            control={control}
            rules={{
              required: "Campo requerido",
              maxLength: {
                value: 6,
                message: "El PIN no puede exceder los 6 dígitos",
              },
            }}
            type={viewPin ? "number" : "password"}
            textAsNumber
          />
          {!viewPin ? (
            <EyeIcon
              className="absolute top-8 right-2 h-5 text-gray-700 hover:cursor-pointer"
              onClick={() => setViewPin(!viewPin)}
            />
          ) : (
            <EyeSlashIcon
              className="absolute top-8 right-2 h-5 text-gray-700 hover:cursor-pointer"
              onClick={() => setViewPin(!viewPin)}
            />
          )}
        </div>
        {userType === "manager" && (
          <Toggle
            name="sendMail"
            control={control}
            defaultValue={false}
            title="Enviar detalles vía correo"
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-5">
        <Button
          name="Atrás"
          color="slate-600"
          textColor="slate-700"
          action={() => beforeStep && beforeStep()}
          outline
        />
        <Button name="Siguiente" color="slate-600" action={afterAction} loading={fetchingUser || fetchingEmail} />
      </div>
    </>
  );
};

export default DetailUserComponent;
