import { OrderSelledProduct, OrderTicket } from "../../../interfaces/ServerInterfaces";
import GenericTable, { DataTableInterface } from "../../../components/misc/GenericTable";
import { translateOrderState } from "../../../utils/translate";
import { formatCalendar } from "../../../utils/helpers";

interface Ticket {
  tickets: OrderTicket[];
}


const Tickets = ({ tickets }: Ticket) => {
  //Selled Prod table ------------------------------------------
  const prodTitles=["Producto", "Cantidad", "Estado"];

  const prodData:(data:OrderSelledProduct[])=>DataTableInterface[]=(data)=>{
    const dataTable:DataTableInterface[] = [];
    data.forEach((item, idx)=>{
      dataTable.push({
        rowId:idx,
        payload:{
          "Producto":item.name,
          "Cantidad":item.quantity,
          "Estado":translateOrderState(item.status)
        }
      })
    })
    return dataTable;
  }
  //--------------------------------------------------------------------

  //Main table
  const tableTitles = ["Estado", "Preparado por", "Área","Orden de producción", "Recibido", ""];
  const tableData: DataTableInterface[] = [];
  tickets.map((item, idx) => {
    tableData.push({
      rowId: idx,
      payload: {
        "Estado": translateOrderState(item.status),
        "Preparado por": item?.preparedBy?.displayName ?? "---",
        "Orden de producción" : item.productionNumber,
        "Recibido": formatCalendar(item.createdAt),
        Área: item.area.name,
        "": <GenericTable tableTitles={prodTitles} tableData={prodData(item.selledProducts)} />,
      },
    });
  });
  return <>
    <GenericTable tableTitles={tableTitles} tableData={tableData} />
  </>;
};

export default Tickets;
