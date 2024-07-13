import { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  ArrowDownOnSquareStackIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  BusinessInterface,
  PriceInvoiceInterface,
} from '../../interfaces/ServerInterfaces';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import CurrencyInput from '../../components/forms/CurrencyInput';
import Button from '../../components/misc/Button';
import Modal from '../../components/misc/GenericModal';
import AlertContainer from '../../components/misc/AlertContainer';
import useServerBusiness from '../../api/useServerBusiness';
import { useParams } from 'react-router-dom';
import Toggle from '../../components/forms/Toggle';
import AmountCurrencyInput from '../../components/forms/AmountCurrencyInput';

interface BusinessFormProps {
  closeModal: Function;
  action: Function;
  isFetching: boolean;
  checkField?: Function;
  initialValues?: BusinessInterface | null;
  deleteAction?: Function;
}

export default function BusinessForm({
  closeModal,
  action,
  initialValues,
}: BusinessFormProps) {
  const { plans, businessCategory } = useAppSelector(
    (state) => state.nomenclator
  );

  const {
    handleSubmit,
    control,
    watch,
    getValues,
    unregister,
    formState: { isSubmitting, dirtyFields },
  } = useForm<
    Record<string, string | number | boolean | PriceInvoiceInterface | null>
  >({
    mode: 'onChange',
    defaultValues: {
      name: initialValues?.name ?? '',
      dni: initialValues?.dni ?? '',
      slug: initialValues?.slug ?? '',
      type: initialValues?.type,
      businessCategoryId: initialValues?.businessCategory.id,
      subscriptionPlanId: initialValues?.subscriptionPlanId,
      subscriptionPlanPrice: initialValues?.subscriptionPlanPrice,
    },
  });
  const { businessId } = useParams();
  const { deleteBusiness, isFetching } = useServerBusiness();
  const [isLoadSubmit, setIsloadSubmit] = useState(false);
  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | PriceInvoiceInterface | null>
  > = (data) => {
    setIsloadSubmit(true);
    action(
      { ...data, status: !!data.status ? 'ACTIVE' : 'INACTIVE' },
      (state: boolean) => {
        closeModal(state);
        setIsloadSubmit(false);
      }
    );
  };
  const delBusissnes = () => {
    deleteBusiness(businessId, setDeleteModal);
  };

  const [deleteModal, setDeleteModal] = useState(false);

  const { currency } = useAppSelector((state) => state.nomenclator);
  const currencies = currency.map((currency) => currency.code);

  const plan = watch('subscriptionPlanId') ?? getValues('subscriptionPlanId');
  useEffect(() => {
    if (plan !== 5) unregister('subscriptionPlanPrice');
  }, [plan]);

  const businessTypes = [
    { id: 'SHOP', name: 'Tienda' },
    { id: 'RESTAURANT', name: 'Restaurante' },
    { id: 'DATE', name: 'Citas' },
  ];

   return (
    <>
      <div className='flex justify-between md:justify-center mb-4'>
        <h3 className='md:text-lg text-md font-medium leading-6 text-gray-900'>
          {initialValues ? `Editar ${initialValues.name}` : 'Nuevo Negocio'}
        </h3>
        {initialValues && (
          <>
            {deleteModal && (
              <Modal state={deleteModal} close={setDeleteModal}>
                <AlertContainer
                  onAction={delBusissnes}
                  onCancel={setDeleteModal}
                  title={`Eliminar el Negocio  `}
                  text='Seguro que desea continuar?'
                  loading={isFetching}
                />
              </Modal>
              
            )}
            <div className='absolute left-8'>
              <Button
                color='gray-500'
                textColor='gray-500'
                action={() => setDeleteModal(true)}
                icon={<TrashIcon className='h-5 w-5' aria-hidden='true' />}
                outline
              />
            </div>
          </>
        )}
      </div>

      <form
        className='space-y-8 divide-y divide-gray-300'
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className='space-y-1 sm:space-y-5'>
          <div className='pt-2'>
            <div className='mt-5 flex flex-col'>
              {/*NAME */}
              <Input
                name='name'
                control={control}
                label={'Nombre'}
                placeholder='Nombre del negocio'
                rules={{ required: 'Este campo es requerido' }}
              />
              {/*BUSINESSCATEGORYID */}
              <Select
                name='businessCategoryId'
                label='Categoría'
                control={control}
                data={
                  businessCategory?.map((itm) => ({
                    id: itm.id,
                    name: itm.name,
                  })) ?? []
                }
                rules={{ required: 'Campo requerido' }}
              />

              {/*DNI */}
              <Input
                name='dni'
                control={control}
                label='DNI'
                rules={{ required: 'Campo requerido' }}
              />

              {/*TYPE */}
              <Select
                data={businessTypes}
                label='Tipo'
                name='type'
                control={control}
                rules={{ required: 'Campo requerido' }}
                defaultValue={initialValues?.type}
              />

              {/*SLUG */}
              <Input
                name='slug'
                control={control}
                label='Slug'
                rules={{ required: 'Campo requerido' }}
              />

              {/*SUBSCRIPTIONPLANID */}
              <Select
                data={
                  plans?.map((item) => ({ id: item.id, name: item.name })) ?? []
                }
                label='Plan'
                name='subscriptionPlanId'
                control={control}
                rules={{ required: 'Campo requerido' }}
              />

              {plan === 5 && (
                <AmountCurrencyInput
                  currencies={currencies}
                  label='Precio'
                  name='subscriptionPlanPrice'
                  control={control}
                  rules={{ required: 'Campo requerido' }}
                  defaultValue={initialValues?.subscriptionPlanPrice}
                />
              )}

              {/* STATE */}
              <Toggle
                control={control}
                name='status'
                title='Activo'
                defaultValue={initialValues?.status === 'ACTIVE'}
              />
            </div>
          </div>
        </div>

        <div className='pt-5'>
          <div className='flex justify-end gap-3'>
            <Button
              color='gray-700'
              textColor='gray-700'
              action={() => closeModal(false)}
              name='Cancelar'
              outline
            />

            <Button
              name={initialValues ? 'Actualizar' : 'Insertar'}
              color='primary'
              icon={
                initialValues ? (
                  <PencilIcon className='h-5' />
                ) : (
                  <ArrowDownOnSquareStackIcon className='h-5' />
                )
              }
              type='submit'
              disabled={
                isSubmitting ||
                isFetching ||
                Object.entries(dirtyFields).length === 0
              }
              loading={isLoadSubmit}
            />
          </div>
        </div>
      </form>
    </>
  );
}
