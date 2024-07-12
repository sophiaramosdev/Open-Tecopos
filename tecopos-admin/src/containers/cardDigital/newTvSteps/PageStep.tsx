import { useContext, useState } from "react";
import { NewTvContext } from "../NewTv";
import { DataTableInterface } from "../../../components/misc/GenericTable";
import MultipleActBtn, { BtnActions } from "../../../components/misc/MultipleActBtn";
import { TvIcon } from "@heroicons/react/24/outline";
import RadioGroupTab from "../template/RadioGrupTab";
import Button from "../../../components/misc/Button";
import NewPageTv from "../newPageSteps/NewPageTv";
import Modal from "../../../components/misc/GenericModal";


const plans = [
  {
    name: "Producto",
    duration: 3000,
    img: "",
    description: "",
  },
  {
    name: "Clásica carrusel de productos vertical1",
    duration: 3000,
    img: "/logo512.png",
    description: "",
  },
  {
    name: "Clásica carrusel de productos vertical2",
    duration: 3000,
    img: "/logo512.png",
    description: "",
  },
  {
    name: "Clásica carrusel de productos vertical3",
    duration: 3000,
    img: "/logo512.png",
    description: "",
  },
];

const PagesContainer = () => {
  const [addPage, setAddPage] = useState(false);
  const { nextStep, beforeStep, control } = useContext(NewTvContext);
  const tableTitles = [
    "Nombre",
    "Activo",
    "Orientación",
    "Código",
    "Creado en",
    "Descripción",
  ];

  const tableData: DataTableInterface[] = [];

  [].forEach((item) => {
    tableData.push({
      rowId: 1,
      payload: {},
    });
  });

  const tableActions: BtnActions[] = [
    {
      title: "Nuevo pagina",
      icon: <TvIcon className="h-5" />,
      action: () => setAddPage(true),
    },
  ];

  return (
    <section className="h-full bg-white rounded-md shadow-md border border-gray-200 p-5 flex flex-col justify-between">
      <div>
        <header className="flex justify-end mb-2">
          <MultipleActBtn items={tableActions} />
        </header>

        <section>
          <RadioGroupTab data={plans} />
        </section>
        {/* <GenericTable
        tableData={tableData}
        tableTitles={tableTitles}
        actions={tableActions}
        rowAction={rowAction}
      /> */}
      </div>

      <footer className="grid grid-cols-2 py-2 gap-2">
        <Button
          name="Atrás"
          color="gray-900"
          action={beforeStep}
          textColor="slate-800"
          full
          outline
        />
        <Button name="Siguiente" color="slate-600" action={nextStep} />
      </footer>

      {addPage && (
        <Modal state={addPage} close={setAddPage} size="l">
          <NewPageTv />
        </Modal>
      )}
    </section>
  );
};

export default PagesContainer;
