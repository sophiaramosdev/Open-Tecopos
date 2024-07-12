import React, { useEffect, useState } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import useServerUsers from "../../../../api/useServerUsers";
import Paginate from "../../../../components/misc/Paginate";
import RuleForm from "./RuleForm";
import { SalaryRuleInterface } from "../../../../interfaces/ServerInterfaces";
import Breadcrumb, { PathInterface } from "../../../../components/navigation/Breadcrumb";

const ListRules = () => {
  const {
    rules,
    getAllRules,
    isLoading,
    paginate,
    isFetching,
    addRule,
    editRule,
    deleteRule,
  } = useServerUsers();
  const [filter, setFilter] = useState<Record<string, string | number | boolean>>({ page: 1 });

  const [newRule, setNewRule] = useState(false);

  const [editModal, setEditModal] = useState<SalaryRuleInterface | null>(null);

  useEffect(() => {
    getAllRules(filter);
  }, [filter]);


  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle = ["Nombre", "Negocio", "Puesto", "Categoría"];
  const tableData: DataTableInterface[] = [];
  rules.forEach((rule) => {
    tableData.push({
      rowId: rule.id,
      payload: {
        Nombre: rule.name,
        Negocio: rule?.business?.name,
        Puesto: rule.post?.name,
        Categoría: rule.personCategory?.name,
      },
    });
  });

  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Nueva regla",
      action: () => setNewRule(true),
    },
  ];

  const rowAction = (id: number) => {
    const rule = rules.find((item) => item.id === id);
    setEditModal(rule!);
  };

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Salario",
    },
    {
      name: "Reglas",
    },
  ];

  //----------------------------------------------------------------------------------------------------
  return (
    <>
      <Breadcrumb
        icon={<BanknotesIcon className="h-6 text-gray-500" />}
        paths={paths}
      />

      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        loading={isLoading}
        actions={actions}
        rowAction={rowAction}
        searching={{
          action: (value: string | null) => {
            value !== null
              ? setFilter({ ...filter, search: value })
              : setFilter({ ...filter, search: value! });
          },
          placeholder: "Buscar regla",
        }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />
      {newRule && (
        <Modal state={newRule} close={setNewRule}>
          <RuleForm
            closeModal={() => setNewRule(false)}
            fetching={isFetching}
            addRule={addRule}
          />
        </Modal>
      )}

      {editModal && (
        <Modal state={!!editModal} close={() => setEditModal(null)} size="m">
          <RuleForm
            closeModal={() => setEditModal(null)}
            fetching={isFetching}
            rule={editModal}
            editRule={editRule}
            deleteRule={deleteRule}
          />
        </Modal>
      )}
    </>
  );
};

export default ListRules;
