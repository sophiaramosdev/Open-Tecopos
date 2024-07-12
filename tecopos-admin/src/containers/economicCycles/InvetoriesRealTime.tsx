import { Fragment, useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxes,
  faPlay,
  faBalanceScaleLeft,
  faSignInAlt,
  faDollyBox,
  faSignOutAlt,
  faDiagramProject,
  faCashRegister,
  faMinusSquare,
} from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import SearchComponent from '../../components/misc/SearchComponent';
import SpinnerLoading from '../../components/misc/SpinnerLoading';
import LegendPick from '../../components/misc/LegendPick';
import { translateMeasure } from '../../utils/translate';
import MultipleActBtn from '../../components/misc/MultipleActBtn';
import { FaRegFileExcel, FaRegFilePdf } from 'react-icons/fa';
import { useAppSelector } from '../../store/hooks';
import reportDownloadHandler from '../../reports/helpers/reportDownloadHandler';
import Modal from '../../components/misc/GenericModal';
import ExcelFileExport from '../../components/commos/ExcelFileExport';
import { exportExcel } from '../../utils/helpers';
import EmptyList from '../../components/misc/EmptyList';
import {
  AreasInterface,
  StockInventoryProducts,
} from '../../interfaces/ServerInterfaces';
import useServerEcoCycle from '../../api/useServerEconomicCycle';
import useServerProduct from '../../api/useServerProducts';
import DetailProductContainer from '../products/DetailProductContainer';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function InvetoriesRealTime() {
  const { areas } = useAppSelector((state) => state.nomenclator);
  const [selectedArea, setSelectedArea] = useState<AreasInterface | null>(null);

  const stockAreas = areas.filter((area) => area.type === 'STOCK');

  return (
    <>
      {stockAreas.length !== 0 ? (
        <div className=' mx-auto  py-3 px-4 sm:py-3 sm:px-3  '>
          <main>
            <>
              <div className='ml-8'>
                {stockAreas.map((item, index) => (
                  <button
                    key={index}
                    className={`${
                      selectedArea?.id !== item.id
                        ? 'items-center my-2   border-2 h-10 rounded-full  border-slate-300 mr-2 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300'
                        : 'items-center my-2   border-2 h-10 rounded-full bg-slate-500 text-white  border-slate-700 mr-2 inline-block p-2 cursor-pointer hover:scale-105 ease-in-out duration-300'
                    }`}
                    type='button'
                    onClick={() => {
                      setSelectedArea(item);
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              {selectedArea !== null ? (
                <div className='max-w-7xl mx-auto  py-3 px-4 sm:py-3 sm:px-3 lg:max-w-7xl '>
                  <Inventory area={selectedArea} />
                </div>
              ) : (
                <div className='text-center mt-10'>
                  <FontAwesomeIcon
                    icon={faBoxes}
                    className='h-16 w-16 mt-3 text-gray-500 '
                    aria-hidden='true'
                  />
                  <h3 className='mt-2 text-sm font-medium text-gray-500'>
                    Seleccione un área de tipo almacén
                  </h3>
                </div>
              )}
            </>
          </main>
        </div>
      ) : (
        <EmptyList />
      )}
    </>
  );
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface InventoryInterface {
  area: AreasInterface | null;
}

export interface ProductsNormalized {
  category: { id: number; name: string };
  products: StockInventoryProducts[];
}

function Inventory({ area }: InventoryInterface) {
  const {
    allProducts,
    paginate,
    product,
    outLoading,
    isFetching,
    getProduct,
    addProduct,
    updateProduct,
    manageManufacturer,
    manageSupplies,
    deleteProduct,
    getAllProducts,
    updateVariationState,
    isLoading: isLoadingProduts
  } = useServerProduct();

  const productCrud = {
    updateProduct,
    deleteProduct,
    manageManufacturer,
    manageSupplies,
    updateVariationState,
    isFetching,
  };

  const [showModal, setShowModal] = useState(false);
  const { ecoCycleId } = useParams();
  const { getStockInventory, stockInventory, isLoading } = useServerEcoCycle();
  const [filter, setFilter] = useState<string | null>(null);
  const { business } = useAppSelector((state) => state.init);
  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    getStockInventory(ecoCycleId!, area!.id.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area]);

  const productsByCategory: ProductsNormalized[] = useMemo(() => {
    const products: ProductsNormalized[] = [];
    stockInventory?.products.forEach((prod) => {
      const idx = products.findIndex(
        (itm) => itm.category.id === prod.productCategoryId
      );
      if (idx !== -1) {
        products[idx].products.push(prod);
      } else {
        products.push({
          category: { id: prod.productCategoryId, name: prod.productCategory },
          products: [prod],
        });
      }
    });
    return products;
  }, [stockInventory]);

  const filterProducts: ProductsNormalized[] = useMemo(() => {
    if (filter) {
       const filteredCategories = productsByCategory.filter(list =>
         list.products.some(prod =>
           prod.name.toLowerCase().includes(filter.toLowerCase())
         )
       );
       return filteredCategories.map(list => ({
         ...list,
         products: list.products.filter(prod =>
           prod.name.toLowerCase().includes(filter.toLowerCase())
         ),
       }));
    } else {
       return productsByCategory.filter(list => list.products.length > 0);
    }
   }, [filter, productsByCategory]);

  if (isLoading) return <SpinnerLoading />;

  const exportAction = (name: string) => {
    const dataToExport: Record<string, string | number>[] = [];
    filterProducts.forEach((item) => {
      dataToExport.push({
        ' ': item.category.name,
        'U/M': '',
        Inicio: '',
        Entradas: '',
        Traslados: '',
        Salidas: '',
        Desperdicios: '',
        Procesados: '',
        Ventas: '',
        'En Almacén': '',
      });
      if (item.products.length !== 0) {
        item.products.forEach((product) => {
          dataToExport.push({
            ' ': '  ' + product.name,
            'U/M': translateMeasure(product.measure) ?? '',
            Inicio: product.initial,
            Entradas: product.entry,
            Traslados: product.movements,
            Salidas: product.outs,
            Desperdicios: product.waste,
            Procesados: product.processed,
            Ventas: product.sales,
            'En Almacén': product.inStock,
          });

          if (product.variations?.length) {
            product.variations.forEach((variation) =>
              dataToExport.push({
                ' ': '    ' + variation.name,
                'U/M': translateMeasure(product.measure) ?? '',
                Inicio: variation.initial,
                Entradas: variation.entry,
                Traslados: variation.movements,
                Salidas: variation.outs,
                Desperdicios: variation.waste,
                Procesados: variation.processed,
                Ventas: variation.sales,
                'En Almacén': variation.inStock,
              })
            );
          }
        });
      }
    });
    exportExcel(dataToExport, name);
    setExportModal(false)
  };

  const rowAction = (id: string) => {
    getProduct(id);
    setShowModal(true);
  };

  return (
    <>
      <div className='px-4  sm:px-6  mt-2'>
        <div className='sm:flex ml-2 sm:items-center'>
          <div className='sm:flex-auto'>
            <h1 className='text-xl font-semibold text-slate-900'>
              Abierto por:{' '}
              {stockInventory?.openAction?.madeBy !== null
                ? stockInventory?.openAction?.madeBy + ' '
                : ' '}
            </h1>
            <h1 className='text-xl font-semibold text-slate-900'>
              Fecha de apertura:{' '}
              {stockInventory?.openAction
                ? moment(stockInventory?.openAction?.madeAt).format('lll')
                : ``}
            </h1>
          </div>
        </div>
        <div className='mt-5 flex flex-col'>
          <div className='-my-2 -mx-4 overflow-x-auto overflow-y-visible sm:-mx-6 '>
            <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
              <div className='overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                <table className='min-w-full'>
                  <thead className='bg-white'>
                    <tr>
                      <th
                        colSpan={10}
                        className='px-3 pt-3.5 text-sm text-right'
                      >
                        <MultipleActBtn
                          btnName='Exportar'
                          items={[
                            {
                              title: 'A Pdf',
                              icon: (
                                <FaRegFilePdf className='h-5 text-gray-500' />
                              ),
                              action: () =>
                                reportDownloadHandler(
                                  'Estado de Inventario',
                                  'inventory_status',
                                  business!,
                                  {
                                    details: {
                                      area: area?.name,
                                      dateFrom:
                                        stockInventory?.openAction?.madeAt,
                                      dateTo:
                                        stockInventory?.closedAction?.madeAt,
                                      ...stockInventory,
                                    },
                                    products: filterProducts,
                                  }
                                ),
                            },
                            {
                              title: 'A Excel',
                              icon: (
                                <FaRegFileExcel className='h-5 text-gray-500' />
                              ),
                              action: () => setExportModal(true),
                            },
                          ]}
                        />
                      </th>
                    </tr>
                    <tr>
                      <th
                        colSpan={1}
                        scope='colgroup'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-slate-900'
                      >
                        <SearchComponent
                          placeholder='Buscar producto'
                          findAction={(match: string) => setFilter(match)}
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faBalanceScaleLeft}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='U/M'
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faPlay}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='Inicio'
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faSignInAlt}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='Entradas'
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faDollyBox}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='Traslados'
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faSignOutAlt}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='Salidas'
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faMinusSquare}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='Desperdicios'
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faDiagramProject}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='Procesados'
                        />
                      </th>
                      <th
                        scope='col'
                        className=' relative group px-3 py-3.5 text-center text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faCashRegister}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='Ventas'
                        />
                      </th>
                      <th
                        scope='col'
                        className='relative group px-3 py-3.5 text-left text-sm font-semibold text-slate-900'
                      >
                        <FontAwesomeIcon
                          icon={faBoxes}
                          className='text-slate-900 h-4'
                        />
                        <LegendPick
                          className='hidden absolute top-10 left-0 group-hover:block'
                          text='En almacén'
                        />
                      </th>
                      <th scope='col'></th>
                    </tr>
                  </thead>
                  <tbody className='bg-white'>
                    {filterProducts.map((item, idx) => {
                      return (
                        <Fragment key={idx}>
                          <tr className='border-y-2 border-slate-200'>
                            <th
                              colSpan={10}
                              scope='colgroup'
                              className='bg-slate-100 px-2 py-3 text-left font-semibold text-slate-900 sm:px-6'
                            >
                              {item.category.name}
                            </th>
                          </tr>
                          {item.products.map((product, productIdx) => (
                            <Fragment key={productIdx}>
                              <tr
                                onClick={() => {
                                  rowAction((product.productId.toString()))
                                }}
                                className={`cursor-pointer ${classNames(
                                  productIdx === 0
                                    ? 'border-slate-300'
                                    : 'border-slate-200',
                                  product.inStock < 0 ? 'bg-rose-200' : '',
                                  'border-t hover:bg-orange-50'
                                )}`}
                              >
                                <td className='whitespace-nowrap px-8 py-4 text-sm text-left text-slate-500 font-semibold'>
                                  {product.name}
                                </td>
                                <td className='whitespace-nowrap  text-center  px-3 py-4 text-sm text-slate-500'>
                                  {translateMeasure(product.measure)}
                                </td>
                                <td className='whitespace-nowrap  text-center  px-3 py-4 text-sm text-slate-500'>
                                  {product.initial}
                                </td>
                                <td className='whitespace-nowrap text-center  px-3 py-4 text-sm text-slate-500'>
                                  {product.entry !== 0 && product.entry}
                                </td>
                                <td className='whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500'>
                                  {product.movements !== 0 && product.movements}
                                </td>
                                <td className='whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500'>
                                  {product.outs !== 0 && product.outs}
                                </td>
                                <td className='whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500'>
                                  {product.waste !== 0 && product.waste}
                                </td>
                                <td className='whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500'>
                                  {product.processed !== 0 && product.processed}
                                </td>
                                <td className='whitespace-nowrap px-3 py-4 text-center text-sm text-slate-500'>
                                  {`${
                                    product?.sales && product?.sales !== 0
                                      ? product.sales
                                      : ''
                                  } ${
                                    product?.onlineSales &&
                                    product?.onlineSales !== 0
                                      ? '(' + product.onlineSales + ')'
                                      : ''
                                  }`}
                                </td>
                                <td className='whitespace-nowrap font-extrabold px-3 py-4 text-sm text-slate-600'>
                                  {product.inStock}
                                </td>
                              </tr>
                              {product.variations?.length !== 0 &&
                                product.variations?.map((variation, idx) => (
                                  <tr
                                    key={idx}
                                    className={classNames(
                                      idx === 0
                                        ? 'border-slate-300'
                                        : 'border-slate-200',
                                      variation.inStock < 0
                                        ? 'bg-rose-200'
                                        : '',
                                      'border-t hover:bg-orange-50'
                                    )}
                                  >
                                    <td className='whitespace-nowrap px-12 py-4 text-xs text-left text-slate-500 font-semibold'>
                                      {variation.name}
                                    </td>
                                    <td className='whitespace-nowrap  text-center  px-3 py-4 text-xs text-slate-500'>
                                      {''}
                                    </td>
                                    <td className='whitespace-nowrap  text-center  px-3 py-4 text-xs text-slate-500'>
                                      {variation.initial}
                                    </td>
                                    <td className='whitespace-nowrap text-center  px-3 py-4 text-xs text-slate-500'>
                                      {variation.entry !== 0 && variation.entry}
                                    </td>
                                    <td className='whitespace-nowrap text-center px-3 py-4 text-xs text-slate-500'>
                                      {variation.movements !== 0 &&
                                        variation.movements}
                                    </td>
                                    <td className='whitespace-nowrap text-center px-3 py-4 text-xs text-slate-500'>
                                      {variation.outs !== 0 && variation.outs}
                                    </td>
                                    <td className='whitespace-nowrap text-center px-3 py-4 text-xs text-slate-500'>
                                      {variation.waste !== 0 && variation.waste}
                                    </td>
                                    <td className='whitespace-nowrap text-center px-3 py-4 text-xs text-slate-500'>
                                      {variation.processed !== 0 &&
                                        variation.processed}
                                    </td>
                                    <td className='whitespace-nowrap px-3 py-4 text-center text-xs text-slate-500'>
                                      {`${
                                        variation.sales !== 0
                                          ? variation.sales
                                          : ''
                                      } ${
                                        variation.onlineSales !== 0
                                          ? '(' + variation.onlineSales + ')'
                                          : ''
                                      }`}
                                    </td>
                                    <td className='whitespace-nowrap font-bold px-3 py-4 text-xs text-slate-600'>
                                      {variation.inStock}
                                    </td>
                                  </tr>
                                ))}
                            </Fragment>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            exportAction={exportAction}
          />
        </Modal>
      )}

      {showModal && (
        <Modal state={showModal} close={setShowModal} size="l">
          <DetailProductContainer
            closeModal={() => setShowModal(false)}
            crud={productCrud}
            loading={isLoadingProduts}
            product={product}
          />
        </Modal>
      )}
    </>
  );
}
