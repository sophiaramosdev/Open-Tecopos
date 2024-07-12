import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import { useParams } from "react-router-dom";
import Button from "../../../components/misc/Button";
import { FaPlus } from "react-icons/fa6";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import InlineRadio from "../../../components/forms/InlineRadio";

const NewUserAccess = ({close}:{close:Function}) => {
  const { bankAccountId } = useParams();
  const { handleSubmit, control, watch } = useForm();
  const { bankAccount, addNewUserAccess, isFetchingB } =
    useContext(DetailAccountContext);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    addNewUserAccess!(bankAccountId, { usersIds: [data.id] }, close);
  };

  const userType = watch("type");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <InlineRadio
        data={[
          { value: "internal", label: "Usuario interno" },
          { value: "external", label: "Usuario externo" },
        ]}
        name="type"
        control={control}
        defaultValue={"internal"}
      />

      {userType === "external" ? (
        <AsyncComboBox
          name="id"
          className="flex-grow-1 w-full"
          label="Añadir usuario externo"
          dataQuery={{
            url: "/security/global/users",
          }}
          normalizeData={{
            id: "id",
            name: ["displayName", "email"],
            disabled: bankAccount?.allowedUsers.map((user) => user.id),
          }}
          control={control}
        />
      ) : (
        <AsyncComboBox
          name="id"
          className="flex-grow-1 w-full"
          label="Añadir usuario interno"
          dataQuery={{
            url: "/security/users",
          }}
          normalizeData={{
            id: "id",
            name: ["displayName", "email"],
            disabled: bankAccount?.allowedUsers.map((user) => user.id),
          }}
          control={control}
        />
      )}

      <div className="flex justify-end pt-5 w-full">
        <Button
          name="Añadir"
          color="slate-600"
          textColor="slate-600"
          icon={<FaPlus className="h-5" />}
          outline
          loading={isFetchingB}
          type="submit"
        />
      </div>
    </form>
  );
};

export default NewUserAccess;
