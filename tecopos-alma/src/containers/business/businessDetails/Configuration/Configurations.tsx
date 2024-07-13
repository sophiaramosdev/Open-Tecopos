import {
  BusinessInterface,
  ConfigurationInterface,
  SendConfigUpdate,
} from '../../../../interfaces/ServerInterfaces';
import { SubmitHandler, useForm } from 'react-hook-form';
import ButtonActualizado from '../../../../components/misc/ButtonActualizado';
import useServerBusiness from '../../../../api/useServerBusiness';
import { useParams } from 'react-router-dom';
import Input from '../../../../components/forms/Input';
import Toggle from '../../../../components/misc/Toggle';

const Configurations = ({ business }: { business: BusinessInterface }) => {
  const { isLoading, isFetching, updateBusiness } = useServerBusiness();
  const { businessId } = useParams();
  const { handleSubmit, control } = useForm<Partial<BusinessInterface>>({
    mode: 'onChange',
  });

  const onSubmit: SubmitHandler<Partial<BusinessInterface>> = (data) => {
    updateBusiness!(businessId, { ...data }, () => null);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='space-y-10 divide-y divide-gray-900/10 mt-1'
    >
      {/* <div className='grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-5'>
        <div className='px-4'>
          <h2 className='text-base font-semibold leading-7 text-gray-900'>
            Woocommerce
          </h2>
        </div>

        <div className='bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-4'>
          <div className='px-3 py-1.5'>
            <Input
              name='woo_ck'
              control={control}
              defaultValue={business.woo_ck}
              label='Cliente Key (ck)'
              placeholder='Cliente Key (ck)'
            />
          </div>
          <div className='px-3 py-1.5'>
            <Input
              name='woo_sk'
              control={control}
              defaultValue={business.woo_sk}
              label='Secret Key (sk)'
              placeholder='Secret Key (sk)'
            />
          </div>
          <div className='px-3 py-1.5'>
            <Input
              name='woo_apiBase'
              control={control}
              defaultValue={business.woo_apiBase}
              label='Woo API Base'
              placeholder='Woo API Base'
            />
          </div>
          <div className='px-3 py-1.5'>
            <Input
              name='woo_apiVersion'
              control={control}
              defaultValue={business.woo_apiVersion}
              label='Woo API Version'
              placeholder='Woo API Version'
            />
          </div>
        </div>
      </div> */}

      <div className='grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-5'>
        <div className='px-2'>
          <h2 className='text-base font-semibold leading-7 text-gray-900'>
            Tienda online
          </h2>
        </div>

        <div className='bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-4'>
          <div className='px-3 py-1.5'>
            <Input
              name='accessKey'
              control={control}
              defaultValue={business.accessKey}
              label='Clave de acceso TECOPOS'
              placeholder='Clave de acceso TECOPOS'
            />
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-5'>
        <div className='px-4 sm:px-0'>
          <h2 className='text-base font-semibold leading-7 text-gray-900'>
            Notificaciones
          </h2>
        </div>

        <div className='bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-4'>
          <div className='px-3 py-1.5'>
            <Input
              name='notificationServerKey'
              control={control}
              defaultValue={business.notificationServerKey}
              label='Server key'
              placeholder='Server key'
            />
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-5'>
        <div className='px-2'>
          <h2 className='text-base font-semibold leading-7 text-gray-900'>
           Buscador sin terceros
          </h2>
        </div>

        <div className='bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-4'>
          <div className='px-3 py-1.5'>
            <Toggle
              name='indexSinTerceros'
              control={control}
              defaultValue={business?.indexSinTerceros}
              title='Buscador sin terceros'
            />
          </div>
        </div>
      </div>

      <div className='pt-6'>
        <div className='max-w-full flow-root'>
          <div className='float-right'>
            <ButtonActualizado
              color='slate-600'
              type='submit'
              name='Actualizar'
              loading={isFetching}
              disabled={isLoading || isFetching}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default Configurations;
