import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import useServerUsers from "../../../api/useServerUsers";
import GenericTable, {
  DataTableInterface, FilterOpts,
} from "../../../components/misc/GenericTable";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/modals/GenericModal";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import EditPerson from "./editPersonWizzard/EditPersonContainer";
import NewUserWizzard from "./newPersonWizzard/NewPersonWizzard";
import ImageComponent from "../../../components/misc/Images/Image";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../store/hooks";
import SideNav from "../../../components/misc/SideNav";
import PersonsSummary from "./PersonsSummary";
import useServer from "../../../api/useServerMain";

const ListPeople = () => {
  const {
    getPeople,
    addPerson,
    editPerson,
    deletePerson,
    people,
    paginate,
    isLoading,
    isFetching,
  } = useServerUsers();

  const { personCategories, personPosts } = useAppSelector(
    (state) => state.nomenclator
  );
  const { branches, business } = useAppSelector(
    (state) => state.init
  );
  const {allowRoles: verifyRoles} = useServer();

  const [currentTab, setCurrentTab] = useState("summary");
  const [filter, setFilter] = useState<Record<string, string | number | boolean>>({ page: 1 });
  const [newUserModal, setNewUserModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });

  useEffect(() => {
    getPeople(filter, currentTab === "actual");
  }, [filter]);

  useEffect(() => {
    if (currentTab === "actual") {
      getPeople({ ...filter, isActive: true }, true);
    }

    if (currentTab === "historical") {
      getPeople({ ...filter, isActive: false }, false);
    }

  }, [currentTab])



  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle = ["Nombre", "Cargo"];
  if (business!.mode === 'GROUP') tableTitle.splice(1, 0, "Negocio");
  if (currentTab === "actual") tableTitle.push("Categoría");
  if (currentTab === "actual") tableTitle.push("En el negocio");


  const tableDataPeople: DataTableInterface[] = [];
  people.forEach((item) =>
    tableDataPeople.push({
      rowId: item.id,
      payload: {
        Nombre: (
          <div className="inline-flex items-center gap-2">
            <ImageComponent
              className="flex items-center justify-center h-10 w-10 rounded-full overflow-hidden"
              src={item?.profilePhoto?.src}
              hash={item?.profilePhoto?.blurHash}
            />
            <div className="flex flex-col">
              <p>{`${item.firstName ?? ""} ${item.lastName ?? ""} `}</p>
            </div>
          </div>
        ),
        "Negocio": <p className="font-semibold"> {branches.find(objeto => objeto.id === item.businessId) ? branches.find(objeto => objeto.id === item.businessId)?.name : ''} </p>,
        "En el negocio": item.isInBusiness ? (
          <div className="flex justify-center">
            <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></div>
          </div>
        ) : (
          ""
        ),
        Cargo: <p className="font-semibold">{item.post?.name ?? "-"}</p>,
        "Categoría": <p className="font-semibold">{item?.personCategory?.name ?? "-"}</p>,
      },
    })
  );


  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar persona",
  };

  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Alta",
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
      name: "Personas",
    },
    {
      name: currentTab === "actual" ? "Actual" : currentTab === "summary" ? "Resumen" : "Histórico",
    },
  ];
  //------------------------------------------------------------------------------------

  const postIdSelectorData: SelectInterface[] = personPosts.map((item) => ({ id: item.id, name: item.name })) ?? []
  const personCategoryIdSelectorData: SelectInterface[] = personCategories.map((item) => ({ id: item.id, name: item.name })) ?? []
  const branchesIdSelectorData: SelectInterface[] = branches.map((item) => ({ id: item.id, name: item.name })) ?? []

  //Filters
  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "select",
      filterCode: "postId",
      name: "Cargo",
      data: postIdSelectorData
    },
    {
      format: "select",
      filterCode: "personCategoryId",
      name: "Categoria de persona",
      data: personCategoryIdSelectorData
    },
    {
      format: "boolean",
      filterCode: "isInBusiness",
      name: "Está en el negocio"
    },
  ];

  let groupFilter: FilterOpts = {
    format: "select",
    filterCode: "businessId",
    name: "Negocio",
    data: branchesIdSelectorData
  }

  if (business!.mode === 'GROUP' && verifyRoles(['GROUP_OWNER'], true)) availableFilters.push(groupFilter);

  const filterAction = (data: Record<string, string | number | boolean> | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };


  const tabs = [
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Resumen",
      href: "summary",
      current: currentTab === "summary",
    },
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Actual",
      href: "actual",
      current: currentTab === "actual",
    },
    {
      //icon: <BanknotesIcon className="h-6" />,
      name: "Histórico",
      href: "historical",
      current: currentTab === "historical",
    }
  ];



  return (
    <>
      <Breadcrumb
        icon={<UserGroupIcon className="h-6 text-gray-500" />}
        paths={paths}
      />


      <div className="sm:grid grid-cols-10 gap-3">
        <SideNav
          tabs={tabs}
          action={setCurrentTab}
          className="col-span-10 sm:col-span-2"
        />

        <div className='sm:col-span-8 pl-3 pt-1'>
          {
            currentTab === "summary" && (
              <PersonsSummary />
            )
          }
          {(currentTab === 'actual') &&
            <GenericTable
              tableData={tableDataPeople}
              tableTitles={tableTitle}
              loading={isLoading}
              searching={searching}
              actions={actions}
              rowAction={rowAction}
              filterComponent={{ availableFilters, filterAction }}
              paginateComponent={
                <Paginate
                  action={(page: number) => setFilter({ ...filter, page })}
                  data={paginate}
                />
              }
            />
          }
          {(currentTab === 'historical') &&
            <GenericTable
              tableData={tableDataPeople}
              tableTitles={tableTitle}
              loading={isLoading}
              searching={searching}
              rowAction={rowAction}
              filterComponent={{ availableFilters, filterAction }}
              paginateComponent={
                <Paginate
                  action={(page: number) => setFilter({ ...filter, page })}
                  data={paginate}
                />
              }
            />
          }

        </div>

      </div>

      {newUserModal && (
        <Modal state={newUserModal} close={setNewUserModal} size="m">
          <NewUserWizzard
            addPerson={addPerson}
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
          <EditPerson
            id={editUserModal.id}
            editPerson={editPerson}
            deletePerson={deletePerson}
            isFetching={isFetching}
            closeModal={() => setEditUserModal({ state: false, id: null })}
            currentTab={currentTab}
          />
        </Modal>
      )}
    </>
  );
};

export default ListPeople;
