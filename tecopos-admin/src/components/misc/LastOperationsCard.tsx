/* eslint-disable jsx-a11y/no-redundant-roles */
/* eslint-disable jsx-a11y/img-redundant-alt */
import { useEffect, useState } from 'react';
import { translateMeasure } from '../../utils/translate';
import useServerArea from '../../api/useServerArea';
import SpinnerLoading from './SpinnerLoading';
import { ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline';
import EmptyList from './EmptyList';
import { formatCalendar } from '../../utils/helpers';
import MovementsTypeBadge from './badges/MovementsTypeBadge';
import Modal from './GenericModal';
import DetailMovement from '../../containers/areas/stock/movements/DetailMovement';

const defaultAvatar = require('../../assets/user-default.jpg');

const LastOperationsCard = () => {
  const { getMovementByArea, allMovements, isLoading } = useServerArea();
  const [modalMovement, setModalMovement] = useState<{
    movementId: number | null;
    modalState: boolean;
  }>({ movementId: null, modalState: false });

  useEffect(() => {
    getMovementByArea({ operation: 'WASTE,OUT', per_page: 15 });
  }, []);

  return (
    <div>
      {modalMovement.modalState && (
        <Modal
          close={() =>
            setModalMovement({
              modalState: false,
              movementId: null,
            })
          }
          state={modalMovement.modalState}
          size='l'
        >
          <DetailMovement id={modalMovement.movementId} />
        </Modal>
      )}
      <div className='flex items-center gap-2'>
        <h1 className='text-lg font-bold text-gray-900'>
          Últimas operaciones de merma y salidas
        </h1>
        <ArrowPathRoundedSquareIcon className='h-6 animate-pulse' />
      </div>
      <div className='border border-gray-200 bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 max-h-[22rem]'>
        {isLoading ? (
          <SpinnerLoading className='py-[2.14rem]' />
        ) : allMovements.length > 0 ? (
          <ul role='list' className='border border-gray-200'>
            {allMovements.map((movement) => (
              <li
                key={movement.id}
                className='flex justify-between gap-x-6 py-5 odd:bg-gray-100 hover:cursor-pointer'
                onClick={() =>
                  setModalMovement({
                    modalState: true,
                    movementId: movement.id,
                  })
                }
              >
                <div className='ml-4 flex min-w-0 w-[50%] gap-x-4 justify-center items-center'>
                  <img
                    className='h-12 w-12 flex-none rounded-full bg-gray-50'
                    src={movement.movedBy.avatar?.thumbnail || defaultAvatar}
                    alt='Moved by Picture'
                  />
                  <div className='min-w-0 flex-auto justify-center'>
                    <p className='text-sm font-semibold '>
                      {movement.movedBy.displayName}
                    </p>
                    <p className='mt-1 truncate text-xs text-gray-500'>
                      {movement.area.name}
                    </p>
                  </div>
                </div>
                <div className='hidden shrink-0 w-[26%] sm:flex sm:flex-col items-center justify-center'>
                  <MovementsTypeBadge operation={movement.operation} />
                  <p className='mt-1 text-xs text-gray-500'>
                    {formatCalendar(movement.createdAt.toString(), true)}
                  </p>
                </div>
                <div className='hidden shrink-0 w-[24%] sm:flex sm:flex-col items-center justify-center sm:flex-wrap mr-1'>
                  <p className='text-sm font-semibold text-center'>
                    {movement.product.name}
                  </p>
                  <p className='mt-1 text-xs text-gray-500'>
                    {movement.quantity * -1}{' '}
                    {translateMeasure(movement.product.measure)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className='py-[1.5rem]'>
            <EmptyList />
          </div>
        )}
      </div>
    </div>
  );
};

export default LastOperationsCard;
