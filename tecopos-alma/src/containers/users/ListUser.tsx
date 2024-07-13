import { useEffect, useState } from "react";
import Breadcrumb from "../../components/navigation/Breadcrumb";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
  SearchingInterface,
} from "../../components/misc/GenericTable";
import useServerUser from "../../api/userServerUser";
import { BasicType } from "../../interfaces/LocalInterfaces";
import Paginate from "../../components/misc/Paginate";
import ImageComponent from "../../components/Images/Image";
import StateSpanForTable from "../../components/misc/StateSpanForTable";
import Modal from "../../components/misc/GenericModal";
import UserInfo from "./UserInfo";
import { TableActions } from "../../components/misc/MultipleActBtn";
import UserForm from "./UsersForm";
import { useParams } from "react-router-dom";


const ListUser = () => {
  const {
    getAllUsers,
    isLoading,
    allUsers,
    paginate,
    addUser: add,
    getUser,
    user,
    updateUser,
    deleteUser,
    isFetching,
  } = useServerUser();
  const {businessId} = useParams();
  const paths = [{ name: "Usuarios" }];
  const [filter, setFilter] = useState<BasicType>({ page: 1, businessId:businessId??null });
  const [addUserModal, setAddUserModal] = useState(false);
  const [userDetail, setUserDetail] = useState<number | null>(null);

  useEffect(() => {
    getAllUsers(filter);
  }, [filter]);
  //Table data ------------------------------------------------
  const tableTitles = ["Nombre", "Negocio", "Estado", "Roles"];
  const tableData: DataTableInterface[] = [];
  allUsers.forEach((user) => {
    tableData.push({
      rowId: user.id,
      payload: {
        Nombre: (
          <div className="flex gap-2 items-center">
            <ImageComponent
              hash={user?.avatar?.blurHash}
              src={user?.avatar?.src}
              className="rounded-full h-10 w-10"
            />
            {user.displayName ?? user.username ?? user.email}
          </div>
        ),
        Negocio: user.business?.name,
        Roles: (
          <div className="flex flex-col">
            {user.roles.map((role, idx) => (
              <p key={idx} className="font-semibold">
                {role.name}
              </p>
            ))}
          </div>
        ),
        Estado: (
          <StateSpanForTable
            currentState={user.isActive}
            greenState="Activo"
            redState="Desactivado"
          />
        ),
      },
    });
  });

  const searching: SearchingInterface = {
    action: (search: string) => setFilter({ ...filter, search }),
    placeholder: "Buscar usuario",
  };

  const rowAction = (userId: number) => setUserDetail(userId);

  const actions: TableActions[] = [
    {
      title: "Nuevo usuario",
      icon: <PlusIcon className="h-5" />,
      action: () => setAddUserModal(true),
    },
  ];

  //--------------------------------------------------------------
  return (
    <>
      {!businessId&&<Breadcrumb icon={<UserGroupIcon className="h-6 w-6" />} paths={paths} />}
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        searching={searching}
        rowAction={rowAction}
        actions={actions}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
        loading={isLoading}
      />
      {addUserModal && (
        <Modal state={addUserModal} close={setAddUserModal}>
          <UserForm
            userManage={{ add, isFetching }}
            close={() => setAddUserModal(false)}
          />
        </Modal>
      )}
      {userDetail && (
        <Modal close={() => setUserDetail(null)} state={!!userDetail} size="l">
          <UserInfo
            id={userDetail}
            userManage={{
              get: getUser,
              upd: updateUser,
              del: deleteUser,
              isFetching,
              isLoading,
              user,
            }}
            closeModal={() => setUserDetail(null)}
          />
        </Modal>
      )}
    </>
  );
};

export default ListUser;
