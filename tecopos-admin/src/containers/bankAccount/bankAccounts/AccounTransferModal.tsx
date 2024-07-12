import { SubmitHandler, useForm } from "react-hook-form";
import GenericTable, { DataTableInterface } from "../../../components/misc/GenericTable";
import { ReactNode, useContext, useEffect, useState } from "react";
import { DetailAccountContext } from "./MainBankAccount";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import Button from "../../../components/misc/Button";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"
import { SysUserInterface } from "../../../interfaces/ServerInterfaces";
import Check from "../../../components/forms/GenericCheck";
import useServerBankAccount from "../../../api/useServerBankAccount";
import { useNavigate, useParams } from "react-router-dom";

interface AccounTransferModalProps{
  closeModal: Function
}

export const AccounTransferModal = ( { closeModal }:AccounTransferModalProps ) => {
  
  // Hooks
  const { userEnableAcount, isFetching, isLoading, getUserEnableAcount } = useContext(DetailAccountContext);
  const { handleSubmit, control, watch, formState } = useForm();
  const { transferProperty }  = useServerBankAccount()
  const [filter, setFilter] = useState<BasicType | null>(null)
  const [newOwnerAccountId, setNewOwnerAccountId] = useState <string | null > (null)
  const {bankAccountId} = useParams() 
  const navigate = useNavigate()

  const onSubmit: SubmitHandler<Record<string, string>> = async(data) => {
    
  };
  const searching = {
    action: (search: string | null) => setFilter(search ? {search} : {} ),
    placeholder: "Buscar persona",
  };

  // Display DATA Table
  const displayData: DataTableInterface[] | { deletedRow: boolean; payload: Record<string, ReactNode>; }[] = []
  userEnableAcount?.map( ( item: SysUserInterface ) => {

    let payload: Record<string,string | number | boolean | React.ReactNode> = 
        {
          Usuario:(
            <div className="flex">
              <Check
                checked={ item.id.toString()  === newOwnerAccountId }
                value={item.id}
                onChange={ (e) => { setNewOwnerAccountId(e.target.value ) } }
              />
              <p
              
                className='ml-4 text-sm font-medium text-gray-500 hover:text-gray-700'
              >
                {item.displayName}
              </p>
            </div>
          ),
          
        };
        displayData.push({deletedRow:false , payload: payload })
  } )

  const handlerTransferProperty = () => {
    if(bankAccountId && newOwnerAccountId  ){
      transferProperty(newOwnerAccountId )
      closeModal()
      navigate('/bank_accounts')
    }
  }

  // Effects
  useEffect(() => {
    if(getUserEnableAcount && filter?.search && typeof filter.search === 'string' && filter.search.length > 2 ){
      
      getUserEnableAcount(filter?.search)
    }else {
      getUserEnableAcount && getUserEnableAcount(null)
    }

  }, [filter])


  return (
    <div className="md:col-span-2 mt-5 md:mt-0">
      <div className="grid gap-6 pb-5" >
        <h1 className="text-lg font-medium leading-6 text-gray-900 font-medium leading-6 text-gray-900">Transferencia de Propiedad de cuenta bancaria</h1>
        
        <div className="flex">
        
        <h2 className="text-sm font-bold text-red-600" >¡Esta acción no tiene vuelta atras!</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <GenericTable
          tableTitles={['Usuario']}
          tableData={displayData}
          loading={isLoading}
          searching={searching}
        />
        <div className="flex justify-end pt-8">
          <Button
          name="Transferir"
          color="red-600"
          action={handlerTransferProperty}
          loading={isFetching}
          disabled={isFetching}
          />
      </div>
    </form>
  </div>
    )
}
