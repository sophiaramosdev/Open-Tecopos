import Button from "../../../../components/misc/Button";
import { cleanObj } from "../../../../utils/helpers";
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType, SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import Select from "../../../../components/forms/Select";
import { UserInterface } from "../../../../interfaces/ServerInterfaces";

interface EditPostInterface {
  user: UserInterface | null;
  editUser: Function;
  isFetching: boolean;
}

const EditUser = ({ editUser, user, isFetching }: EditPostInterface) => {
 
 const { control, handleSubmit } = useForm();

 const onSubmit: SubmitHandler<BasicType> = (data) => {
  editUser(user?.id, cleanObj(data));
 };

 const { branches } = useAppSelector((state) => state.init);
//
 const branchSelector: SelectInterface[] = branches.map((branch) => ({
   id: branch.id,
   name: branch.name,
 }));
 let businessDefault = branchSelector.find(business => business.id === user?.businessId)
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className=" flex flex-col gap-3 h-96 pt-3">
          
            <Select
              className="w-full"
              data={branchSelector}
              control={control}
              name="businessId"
              label="Negocio"
              // defaultValue={}
              rules={{ required: "* Campo requerido" }}
              defaultValue={businessDefault?.id}
            />
          
        </div>
        <div className="flex justify-end mt-5">
          <Button
            name="Actualizar"
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

export default EditUser;
