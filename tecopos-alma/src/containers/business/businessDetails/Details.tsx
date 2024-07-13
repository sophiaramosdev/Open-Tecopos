import { useContext } from 'react';
import moment from 'moment';
import { BusinessInterface } from '../../../interfaces/ServerInterfaces';

interface Detail {
  business: BusinessInterface;
}

export default function Details({ business }: Detail) {
  return (
    <>
      <div className='flex bg-gray-50 border-t border-gray-200 mx-auto rounded-md'>
        <dl className='w-[700px] mx-auto'>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>ID:</dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.id}
            </dd>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>DNI:</dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.dni}
            </dd>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>Slug:</dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.slug}
            </dd>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>
              Categoría:
            </dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.businessCategory?.name}
            </dd>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>Tipo:</dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.type}
            </dd>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>Plan:</dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.subscriptionPlan.name}
            </dd>
          </div>
          <div className='bg-gray-50 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>
              Licencia hasta:
            </dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.licenceUntil
                ? moment(business?.licenceUntil).format('ll')
                : '__ /__ /__'}
            </dd>
          </div>
        </dl>
      </div>

      <div className='flex bg-gray-50 border-t border-gray-200 mt-5 mx-auto rounded-md'>
        <dl className='w-[700px] mx-auto'>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>
              Dirección:
            </dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {(business?.address?.locality ?? '') +
                ' ' +
                (business?.address?.municipality?.name ?? '')}
            </dd>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>
              Fecha Creado:
            </dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {moment(business?.createdAt).format('ll [->] hh:mm A')}
            </dd>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'>
            <dt className='text-md font-medium text-gray-500 ml-20'>Correo:</dt>
            <dd className='italic text-md text-gray-900 text-left ml-20'>
              {business?.email}
            </dd>
          </div>
          {business?.phones?.length !== 0 && (
            <h3 className='text-md font-medium text-gray-500 text-center mt-3'>
              Teléfonos:
            </h3>
          )}
          {business?.phones?.map((phone, id) => {
            return (
              <div
                key={id}
                className='bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:px-6'
              >
                <dt className='text-md font-medium text-gray-500 ml-20'>
                  {phone.number}
                </dt>
                <dd className='italic text-md text-gray-900 text-left ml-20'>
                  {phone.description}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </>
  );
}
