import { useState, useEffect } from "react";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import {
  cleanObj,
  validateEmail
} from "../../../../utils/helpers";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import useServerUsers from "../../../../api/useServerUsers";
import {
  PersonInterface, UserInterface,
} from "../../../../interfaces/ServerInterfaces";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { BasicType, SelectInterface } from "../../../../interfaces/InterfacesLocal";
import GenericImageDrop from "../../../../components/misc/Images/GenericImageDrop";
import Modal from "../../../../components/misc/GenericModal";
import LapView from "./LapView";
import Select from "../../../../components/forms/Select";

interface EditInterface {
  person: PersonInterface | null;
  user: UserInterface | null;
  editPerson: Function;
  closeModal: Function;
  isFetching: boolean;
}

const DetailUserEditComponent = ({
  editPerson,
  person,
  isFetching,
  user
}: EditInterface) => {

  const [LapPreview, setLapPreview] = useState(false)

  const { control, handleSubmit, reset, formState, watch } = useForm()
  const { isFetching: loadingPsw, resetPsw, checkEmail, editUser } = useServerUsers();

  const { fields, append, remove, replace } = useFieldArray({ control, name: "phones" });

  useEffect(() => {
    const phones = person?.phones;
    if (phones?.length !== 0) replace(phones?.map((phone) => ({ number: phone.number, description: phone.description })))
  }, [])

  const onSubmit: SubmitHandler<BasicType> = (data) => {

    const { profilePhotoId,
      firstName,
      lastName,
      email,
      password,
      pinPassword,
      isActive,
      phones,
      barCode,
      sex
    } = data

    const personData = {
      profilePhotoId,
      firstName,
      lastName,
      phones,
      barCode,
      sex
    }
    const userData = {
      email,
      password,
      pinPassword,
      isActive,
    }

    editPerson(person?.id, cleanObj(personData), reset());
    if (user) {
      editUser(user.id, cleanObj(userData), () => { }, false)
    }
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
        <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-100 pr-5 pl-2">
          <GenericImageDrop
            className="h-40 w-40 rounded-full border border-gray-400 m-auto overflow-hidden"
            control={control}
            name="profilePhotoId"
            defaultValue={person?.profilePhoto?.id}
            previewDefault={person?.profilePhoto?.src}
            previewHash={person?.profilePhoto?.blurHash}
          />
          <div className="pt-3 grid grid-cols-2 gap-2">
            <Input
              name="firstName"
              label="Nombre"
              control={control}
              rules={{ required: "Campo requerido" }}
              defaultValue={person?.firstName}
              type="textOnly"
            />
            <Input
              name="lastName"
              label="Apellidos"
              control={control}
              defaultValue={person?.lastName}
              type="textOnly"
            />
          </div>

         <div className="my-4 w-1/2">
         <Select
            name="sex"
            label="Sexo"
            data={sexSelect}
            defaultValue={person?.sex}
            control={control}
          />
         </div>
          {/**Phones */}
          <div className="pt-8">
            <div className="relative border-t border-slate-500 flex justify-center">
              <span className="relative text-center bg-gray-50 px-5 -top-3">
                Teléfonos
              </span>
            </div>
          </div>
          {fields.map((item, idx) => (
            <div key={item.id} className="inline-flex w-full gap-2">
              <div key={item.id} className="grid grid-cols-2 gap-2 w-full mb-2">
                <Input
                  name={`phones.${idx}.number`}
                  control={control}
                  label="Teléfono"
                  rules={{ required: "Llene los datos o elimine el campo" }}
                  textAsNumber
                />
                <Input
                  name={`phones.${idx}.description`}
                  control={control}
                  label="Descripción"
                />
              </div>
              <div className="flex items-end pt-5 mb-2">
                <Button
                  color="red-500"
                  icon={<TrashIcon className="h-5" />}
                  action={() => remove(idx)}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end mt-5 gap-2">
            <Button
              color="slate-400"
              textColor="slate-500"
              icon={<PlusIcon className="h-5" />}
              name="Insertar"
              action={() => append({})}
              full
              outline
            />
          </div>

          

        </div>
        <div className="flex justify-end mt-5">
          <div className="mx-4">
            <Button
              name="Vista previa del solapín"
              color="white"
              textColor="slate-600"
              type="button"
              action={() => setLapPreview(true)}
              outline
            />
          </div>
          <Button
            name="Actualizar"
            color="slate-600"
            type="submit"
            loading={isFetching}
            disabled={isFetching || loadingPsw}
          />

        </div>
      </form>

      {
        LapPreview && (
          <Modal
            state={LapPreview}
            close={() => setLapPreview(false)}
          >
            <LapView person={person} />

          </Modal>
        )
      }
    </>
  );
};

export default DetailUserEditComponent;
