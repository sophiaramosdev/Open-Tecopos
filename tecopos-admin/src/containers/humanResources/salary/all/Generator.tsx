

import {  SubmitHandler, useForm } from 'react-hook-form'
import { BasicType, SelectInterface } from '../../../../interfaces/InterfacesLocal';
import { cleanObj } from '../../../../utils/helpers';
import { useAppSelector } from '../../../../store/hooks';
import useServerUsers from '../../../../api/useServerUsers';
import Breadcrumb, { PathInterface } from '../../../../components/navigation/Breadcrumb';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import Button from '../../../../components/misc/Button';
import DateInput from '../../../../components/forms/DateInput';
import Select from '../../../../components/forms/Select';
import MultiSelect from '../../../../components/forms/Multiselect';

const Generator = () => {

   const { business, branches } = useAppSelector((state) => state.init);

   const { GetSalaryGeneralReport, isFetching } = useServerUsers();

   const { handleSubmit, control } = useForm();

   const selectbranches: SelectInterface[] = [];

   if (branches && branches?.length !== 0) {
      branches?.forEach((item) => {
         selectbranches.push({
            id: item.id,
            name: item.name,
            disabled: false
         });
      });
   } else {
      selectbranches.push({
         id: business?.id!,
         name: business?.name!,
         disabled: false
      });
   }

   //Submit form ----------------------------------------------------------------------------------
   const onSubmit: SubmitHandler<BasicType> = (data) => {
      const allFilters = cleanObj({
         ...data,
      });
      GetSalaryGeneralReport(allFilters)
   };

   const selectDataCodeCurrency: SelectInterface[] = [];

   business?.availableCurrencies.forEach((item) => {
      selectDataCodeCurrency.push({
         id: item.code,
         name: item.code,
         disabled: false
      });
   });

   //Breadcrumb-----------------------------------------------------------------------------------
   const paths: PathInterface[] = [
      {
         name: "Salario",
      },
      {
         name: "Generador",
      },
   ];

   return (
      <>

         <Breadcrumb
            icon={<BanknotesIcon className="h-6 text-gray-500" />}
            paths={paths}
         />

         <form onSubmit={handleSubmit(onSubmit)}>
            <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">

               <div className='w-1/3 my-2'>
                  <DateInput
                     name='startsAt'
                     control={control}
                     label='Desde'
                     untilToday={true}
                     includeTime={true}
                     rules={{ required: "* Campo requerido" }}
                  />
               </div>

               <div className='w-1/3 my-2'>
                  <DateInput
                     name='endsAt'
                     control={control}
                     label='Hasta'
                     untilToday={true}
                     includeTime={true}
                     rules={{ required: "* Campo requerido" }}
                  />
               </div>

               <div className='w-1/3 my-2'>
                  <Select
                     name='codeCurrency'
                     control={control}
                     data={selectDataCodeCurrency}
                     label='Moneda'
                     rules={{ required: "* Campo requerido" }}
                  />
               </div>

               <div className='w-1/3 my-2'>
                  <MultiSelect
                     name='businesses'
                     control={control}
                     data={selectbranches}
                     label='Negocios'
                     rules={{ required: "* Campo requerido" }}
                  />
               </div>


               <div className="px-4 py-3 bg-slate-50 text-right sm:px-6 flex justify-end items-center">
                  <div className="mx-2">
                     <Button
                        color="slate-600"
                        type="submit"
                        name={isFetching ? "Generando" : "Generar"}
                        loading={isFetching}
                     />
                  </div>
               </div>
            </div>

         </form>
      </>
   )
}

export default Generator
