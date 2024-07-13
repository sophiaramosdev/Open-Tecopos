import { useEffect, useState } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { useParams } from "react-router-dom";
import Modal from "../../../components/misc/GenericModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import useServerBranch from "../../../api/useServerBranch";
import BranchInfo from "./BranchInfo";
import ImageComponent from "../../../components/Images/Image";
import SelectBranchComponent from "../../../components/business/SelectBranchComponent";

const Branches = () => {
  const {
    allBranches,
    addBranch,
    getAllBranch,
    isLoading,
    deleteBranch,
    isFetching,
  } = useServerBranch();
  const { businessId } = useParams();

  useEffect(() => {
    getAllBranch(businessId!);
  }, []);

  const [branchInfoModal, setBranchInfoModal] = useState<number|null>(null);

  const [addBranchForm, setAddBranchForm] = useState(false);
  const rowAction = (id: number) => setBranchInfoModal(id);
  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Nuevo Hijo",
      action: () => setAddBranchForm(true),
    },
  ];

  //Data for table ------------------------------------------------------------
  const tableTitles = ["Nombre"];
  const tableData: DataTableInterface[] = [];
  allBranches?.forEach((item) => {
    tableData.push({
      rowId: item.id,
      payload: {
        Nombre: (
          <div className="flex items-center">
            <ImageComponent
              className="h-10 w-10 rounded-full overflow-hidden"
              src={item?.logo?.src}
              hash={item.logo?.blurHash}
            />
            <div className="ml-4">
              <div className="font-medium text-gray-900">{item?.name}</div>
            </div>
          </div>
        ),
      },
    });
  });

  //----------------------------------------------------------------------------

  // @ts-ignore
  return (
    <div className="mt-1 h-full">
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        rowAction={rowAction}
        loading={isLoading}
        actions={actions}
      />
      {!!branchInfoModal && (
        <Modal
          state={!!branchInfoModal}
          close={() => setBranchInfoModal(null)}
          size="m"
        >
          <BranchInfo
            id={branchInfoModal}
            deleteBranch={{
              fetching: isLoading,
              deleteAction: deleteBranch,
            }}
            close={() => setBranchInfoModal(null)}
          />
        </Modal>
      )}

      {addBranchForm && (
        <Modal state={addBranchForm} close={setAddBranchForm}>
          <SelectBranchComponent
            manageBranch={{ addBranch, isFetching }}
            currentBranches={allBranches.map((branch) => branch.id)}
            close={() => setAddBranchForm(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Branches;
