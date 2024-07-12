import {useForm, SubmitHandler} from 'react-hook-form';
import useServerBusiness from '../../api/useServerBusiness';
import Input from '../../components/forms/Input';
import TextArea from '../../components/forms/TextArea';
import Button from '../../components/misc/Button';
import Fetching from '../../components/misc/Fetching';
import { useAppSelector } from '../../store/hooks';

const DetailConfig = () => {
    const {control, handleSubmit} = useForm();
    const {business} = useAppSelector(state=>state.init)
    const {editBusiness, isFetching} = useServerBusiness()
    const onSubmit:SubmitHandler<Record<string, string|number|boolean>> = (data) =>{
        editBusiness(data);
    }
  //  const module_woocommerce = business?.configurationsKey.find(item=>item.key === "module_woocommerce")?.value

  if (isFetching) return <Fetching />;
  return (
    
    <form onSubmit={handleSubmit(onSubmit)} /* w-3/4 */ className=" m-auto shadow-md p-5 rounded-lg bg-gray-50">
         <h5 className='font-semibold p-2 pl-0'>DNI: {business?.dni}</h5>
        <Input label='Nombre' name='name' control={control} defaultValue={business?.name} />
        <Input label='Slogan' name='promotionalText' control={control} defaultValue={business?.promotionalText} />
        <Input label='Horario' name='openHours' control={control} defaultValue={business?.openHours} />
        <TextArea label='Descripción' name='description' control={control} defaultValue={business?.description}  />
        <TextArea label='Pie de comprobante de pago' name='footerTicket' control={control} defaultValue={business?.footerTicket}  />
        <div className='flex justify-end py-2'>
          <Button name='Actualizar' color='slate-600' type='submit' />
        </div>
    </form>
  );
};

export default DetailConfig;
