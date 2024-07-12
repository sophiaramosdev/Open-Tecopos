import React, { useEffect } from 'react';
import useServerArea from '../../api/useServerArea';
import SpinnerLoading from './SpinnerLoading';
import {
  ArrowPathRoundedSquareIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const PendingDispatch = ({ businessId }: { businessId: number }) => {
  const { getTotalPendingDispatch, pendingDispatchCount, isLoading } =
    useServerArea();
  const navigate = useNavigate();

  useEffect(() => {
    getTotalPendingDispatch(businessId);
  }, []);

  return (
    <div>
      <div className='flex justify-between'>
        <div className='flex items-center gap-2'>
          <h1 className='text-lg font-bold text-gray-900'>
            Despachos pendientes
          </h1>
          <ArrowPathRoundedSquareIcon className='h-6 animate-pulse' />
        </div>
        <button
          onClick={() =>
            navigate('stocks/dispatches', {
              state: { filter: { status: 'CREATED' } },
            })
          }
        >
          <ArrowUpRightIcon className='h-5 font-semibold' />
        </button>
      </div>
      <div className='flex border border-gray-200 bg-white h-48 justify-center items-center'>
        {isLoading ? (
          <SpinnerLoading />
        ) : (
          <div className='flex w-full justify-center items-center'>
            <span className='font-semibold tracking-tigh text-7xl'>
              {pendingDispatchCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingDispatch;
