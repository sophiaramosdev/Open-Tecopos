import { TbPackages } from 'react-icons/tb';
import useServerProduct from '../../api/useServerProducts';
import { useEffect, useState } from 'react';
import GenericTable from './GenericTable';
import Paginate from './Paginate';
import { ProductInterface } from '../../interfaces/ServerInterfaces';

const UnderLimitProductsCard = () => {
  const {
    getAllProducts,
    allProducts,
    outLoading: isLoading,
    paginate,
  } = useServerProduct();
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ isUnderAlertLimit: true, page: 1 });

  useEffect(() => {
    getAllProducts({ ...filter });
  }, [filter]);

  const tableData = allProducts.map((product: ProductInterface) => ({
    payload: {
      Producto: product.name,
      Cantidad: product.totalQuantity ?? 0,
      Límite: product.alertLimit ?? 0,
    },
  }));

  return (
    <div className=''>
      <div className='flex items-center gap-2'>
        <h1 className='text-lg font-bold text-gray-900'>
          Productos por debajo del límite de alerta
        </h1>
        <TbPackages className='h-8 animate-pulse' />
      </div>
      <div className='border border-gray-200 bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 max-h-[22rem]'>
        <GenericTable
          tableData={tableData}
          tableTitles={['Producto', 'Cantidad', 'Límite']}
          loading={isLoading}
          paginateComponent={
            <Paginate
              action={(page: number) => setFilter({ ...filter, page })}
              data={paginate}
            />
          }
        />
      </div>
    </div>
  );
};

export default UnderLimitProductsCard;
