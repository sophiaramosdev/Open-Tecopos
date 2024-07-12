import { OpperationsRecordsInterface, OrderInterface } from '../../../interfaces/ServerInterfaces';
import GenericTable, { DataTableInterface } from '../../../components/misc/GenericTable';
import moment from 'moment';

interface Opp {
    records?: OpperationsRecordsInterface[];
  }

  

const Opperations = ({records}:Opp) => {
  const tableTitles = ["Tipo de operación", "Fecha", "Creada por", "Descripción" ]
  const tableData:DataTableInterface[] = records?.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return Number(dateB) - Number(dateA);
  }).map((item, idx)=>({
    rowId:idx, 
    payload:{
        "Tipo de operación":item.title, 
        "Fecha":moment(item?.createdAt).format("DD/MM/YYYY hh:mm A"),
        "Creada por": item.madeBy?.displayName,
        "Descripción": item?.details
    }
  }))??[];

  return (
    <div className='h-96 px-1'>
    <GenericTable tableData={tableData} tableTitles={tableTitles}/>
    </div>
  )
}

export default Opperations