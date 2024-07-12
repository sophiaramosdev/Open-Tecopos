import { useEffect, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useForm, SubmitHandler } from "react-hook-form";
import useServer from "../api/useServerMain";
import Input from "../components/forms/Input";
import Button from "../components/misc/Button";
import { useLocation, useNavigate } from "react-router";


const getLogo = () => {
  switch (process.env.REACT_APP_BUSINESS) {
    case "acenna":
      return require("../assets/Acenna2.gif");

    default:
      return require("../assets/png/logo3.png");
  }
};

export default function LogInPage() {
  const { handleSubmit, control } = useForm();

  const navigate = useNavigate();

  const { pathname } = useLocation();

  const { logIn, isFetching } = useServer();

  const [viewPasw, setViewPasw] = useState(false);

  useEffect(() => {
    if (pathname !== "/") navigate("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    values
  ) => {
    logIn(values);
  };

  return (
    <div className="flex items-center justify-center h-screen ">
      <div className="sm:w-1/3 xl:w-1/5">
        <div className="mx-auto flex justify-center">
          <img className={`${process.env.REACT_APP_BUSINESS === "acenna" ? "h-80 w-auto" : "h-40 w-auto"}`} src={getLogo()} alt="Logo-Tecopos" />
        </div>


        <h2 className={`${process.env.REACT_APP_BUSINESS === "acenna" ? "-mt-14" : ""} text-center text-xl font-bold text-slate-900`}>
          Inicia sesión con tu cuenta
        </h2>
        <form className="h-32 space-y-6 mt-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <Input
                name="username"
                control={control}
                rules={{ required: "Campo requerido" }}
                label="Nombre de usuario"
              />
            </div>
            <div className="relative">
              <Input
                name="password"
                control={control}
                rules={{ required: "Campo requerido" }}
                label="Contraseña"
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
          </div>

          <div>
            <Button
              name="Iniciar"
              color="slate-600"
              type="submit"
              full
              loading={isFetching}
            />
          </div>
        </form>
        {/*process.env.REACT_APP_IS_PERSONALIZATION === "true" && (
          <div className="inline-flex items-center justify-center gap-2 p-3">
            <div className="h-6 w-6">
              <LogoComponent />
            </div>
            <p className="text-slate-700 font-semibold">
              Utilizando tecnología TECOPOS
            </p>
          </div>
        )*/}
      </div>
    </div>
  );
}