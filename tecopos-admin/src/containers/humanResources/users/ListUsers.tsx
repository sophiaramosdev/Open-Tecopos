import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import moment from "moment";
import { useState, useEffect } from "react";
import useServerUsers from "../../../api/useServerUsers";
import StateSpanForTable from "../../../components/misc/badges/StateSpanForTable";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import ImageComponent from "../../../components/misc/Images/Image";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/modals/GenericModal";
import Breadcrumb, { PathInterface } from "../../../components/navigation/Breadcrumb";
import EditUserContainer from "./editUserWizzard/EditUserContainer";
import NewUserWizzard from "./newUserWizzard/NewUserWizzard";
import { formatCalendar } from "../../../utils/helpers";
import { useAppSelector } from "../../../store/hooks";

const ListUsers = () => {
  const {
    getAllUsers,
    addUser,
    editUser,
    deleteUser,
    allUsers,
    paginate,
    isLoading,
    isFetching,
  } = useServerUsers();
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });
  const [newUserModal, setNewUserModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });

  const { branches, business } = useAppSelector(
    (state) => state.init
  );

  useEffect(() => {
    getAllUsers(filter);
  }, [filter]);

  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle = ["Usuario", "Roles", "Estado", "Último acceso"];
  if (business!.mode === 'GROUP') tableTitle.splice(1, 0, "Negocio");
  const tableData: DataTableInterface[] = [];
  allUsers.map((item) =>
    tableData.push({
      rowId: item.id,
      payload: {
        Usuario: (
          <div className="inline-flex items-center gap-2">
            <ImageComponent
              className="flex items-center justify-center h-12 w-12 rounded-full overflow-hidden"
              src={item?.avatar?.src}
              hash={item?.avatar?.blurHash}
            />
            <div className="flex flex-col">
              <p>{item.displayName}</p>
              <p className="text-xs">{item.username}</p>
              <p className="font-normal text-xs">{item.email}</p>{" "}
            </div>
          </div>
        ),
        "Negocio": <p className="font-semibold"> { branches.find(objeto => objeto.id === item.businessId) ? branches.find(objeto => objeto.id === item.businessId)?.name : '' } </p>,
        Estado: <StateSpanForTable currentState={item.isActive} greenState="Activo" redState="Inactivo"  />,
        Roles: item.roles.map((rol, idx) => <div key={idx}>{rol.name}</div>),
        "Último acceso": formatCalendar(item.lastLogin)
      },
    })
  );

  const searching = {
    action: (search: string) => setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar usuario",
  };

  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Nuevo usuario",
      action: () => setNewUserModal(true),
    },
  ];

  const rowAction = (id: number) => {
    setEditUserModal({ state: true, id });
  };

  //----------------------------------------------------------------------------------------------------
  
  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Capital humano",
    },
    {
      name: "Usuarios",
    },
   ];
  //------------------------------------------------------------------------------------

  return (
    <>
    <Breadcrumb
        icon={<UserGroupIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        loading={isLoading}
        searching={searching}
        actions={actions}
        rowAction={rowAction}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />
      {newUserModal && (
        <Modal state={newUserModal} close={setNewUserModal} size="m">
          <NewUserWizzard
            addUser={addUser}
            isFetching={isFetching}
            closeModal={() => setNewUserModal(false)}
          />
        </Modal>
      )}

      {editUserModal.state && (
        <Modal
          state={editUserModal.state}
          close={() => setEditUserModal({ state: false, id: null })}
          size="l"
        >
          <EditUserContainer
            id={editUserModal.id}
            editUser={editUser}
            deleteUser={deleteUser}
            isFetching={isFetching}
            closeModal={() => setEditUserModal({ state: false, id: null })}
          />
        </Modal>
      )}
    </>
  );
};

export default ListUsers;
