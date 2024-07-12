import { useContext } from "react";
import ReceiptContext from "../ReceiptContext";
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import IconTypeFile from "../../../../../components/misc/IconTypeFile";
import { HiOutlineDocumentDownload } from "react-icons/hi";

const Documents = () => {
  const { receipt } = useContext(ReceiptContext);

  const tableTitles = ["Nombre", "Descripción", ""];
  const tableData: DataTableInterface[] = [];
  receipt?.documents.forEach((item: any, idx: number) => {
    const fileType = item?.title?.split(".").reverse()[0];
    tableData.push({
      rowId: idx,
      payload: {
        Nombre: (
          <div className="inline-flex items-center justify-center gap-2">
            <IconTypeFile fileType={fileType} />
            {item?.title}
          </div>
        ),
        Descripción: item?.description??"-",
        "": (
          <div className="inline-flex gap-2 justify-end w-full">
            <HiOutlineDocumentDownload
              className="text-xl cursor-pointer hover:scale-125"
              onClick={() => window.open(item.src)}
            />
          </div>
        ),
      },
    });
  });

  return (
    <div className="h-full overflow-auto scrollbar-none p-3">
      <GenericTable tableTitles={tableTitles} tableData={tableData} />
    </div>
  );
};

export default Documents;
