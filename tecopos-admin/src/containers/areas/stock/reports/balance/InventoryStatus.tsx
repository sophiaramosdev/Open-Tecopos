//@ts-nocheck
import { Fragment, useState, useEffect, useMemo } from 'react';
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
import 'moment/locale/es';
import { translateMeasure } from '../../../../../utils/translate';
import SearchComponent from '../../../../../components/misc/SearchComponent';
import { useServer } from '../../../../../hooks';
import DateInput from '../../../../../components/forms/DateInput';
import Select from '../../../../../components/forms/Select';
import Button from '../../../../../components/misc/Button';
import { useForm, useWatch } from 'react-hook-form';
import LegendPick from '../../../../../components/misc/LegendPick';
import EmptyList from '../../../../../components/misc/EmptyList';
import { useAppSelector } from '../../../../../store/hooks';
import MultipleActBtn from '../../../../../components/misc/MultipleActBtn';
import { FaRegFileExcel, FaRegFilePdf } from 'react-icons/fa';
import reportDownloadHandler from '../../../../../reports/helpers/reportDownloadHandler';
import { exportExcel } from '../../../../../utils/helpers';
import ExcelFileExport from '../../../../../components/commos/ExcelFileExport';
import Modal from '../../../../../components/misc/GenericModal';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function InventoryStatus() {
  const { getInventoryStatusReport, reportData, isLoading } = useServer({});
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { handleSubmit, control } = useForm();

  const stockAreas =
    areas
      ?.filter((area) => area.type === 'STOCK')
      .map(({ id, name }) => {
        return { id, name };
      }) || [];

  const onSubmit: SubmitHandler<Record<string, number>> = (data) => {
    getInventoryStatusReport(data);
  };

  const fieldValues = useWatch({ control, exact: false });

  return (
    <div className=' mx-auto  py-3 px-4 sm:py-3 sm:px-3  '>
      <main>
        <form onSubmit={handleSubmit(onSubmit)} className='py-2'>
          <div className='h-50 border border-slate-300 rounded p-2 overflow-y-visible'>
            <div className='h-50'>
              <div className='md:grid md:grid-cols-2 md:gap-2'>
                <div className='py-2'>
                  <DateInput
                    name='dateFrom'
                    label='Desde *'
                    control={control}
                    rules={{ required: 'Este campo es requerido' }}
                    untilToday
                    includeTime={true}
                  />
                </div>
                <div className='py-2'>
                  <DateInput
                    name='dateTo'
                    label='Hasta *'
                    control={control}
                    rules={{
                      required: 'Este campo es requerido',
                      validate: (dateTo) =>
                        new Date(dateTo) >= new Date(fieldValues.dateFrom),
                    }}
                    untilToday
                    includeTime={true}
                  />
                </div>
                <div className='py-1 col-span-2'>
                  <Select
                    name='areaId'
                    data={stockAreas}
                    label='Area *'
                    control={control}
                    rules={{ required: 'Este campo es requerido' }}
                    defaultValue={() => {}}
                  />
                </div>
              </div>
            </div>

            <div className='px-4 py-3 bg-slate-50 text-right sm:px-6'>
              <Button
                color='gray-600'
                type='submit'
                name={isLoading ? 'Buscando...' : 'Buscar'}
                loading={isLoading}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>

        {reportData && (
          <Inventory
            products={reportData}
            details={{
              dateFrom: fieldValues.dateFrom,
              dateTo: fieldValues.dateTo,
              area:
                areas.find((area) => area.id === fieldValues.areaId)?.name ||
                '',
            }}
          />
        )}
      </main>
    </div>
  );
}

function Inventory({ products, details }) {
  const [listProducts, setListProducts] = useState([]);
  const [filter, setFilter] = useState(null);
  const { business } = useAppSelector((state) => state.init);
  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    let store_sections: any[] | ((prevState: never[]) => never[]) = [];
    if (products.length) {
      products.forEach(
        (item: { productCategoryId: any; productCategory: any }) => {
          // @ts-ignore Find  if  category exist
          const found = store_sections.find(
            (section: { id: any }) => section.id === item.productCategoryId
          );

          if (found) {
            store_sections = store_sections.map(
              (item_data: { id: any; data: any }) => {
                if (item_data.id === item.productCategoryId) {
                  return {
                    ...item_data,
                    data: [...item_data.data, item],
                  };
                }
                return item_data;
              }
            );
          } else {
            //@ts-ignore
            store_sections.push({
              id: item.productCategoryId,
              title: item.productCategory,
              data: [item],
            });
          }
        }
      );

      store_sections = store_sections.sort((a, b) => {
        return a.title.toUpperCase() > b.title.toUpperCase() ? 1 : -1;
      });
    }
    setListProducts(store_sections);
  }, [products]);

  const filterProducts = useMemo(() => {
    if (filter) {
      return listProducts.map((list) => ({
        /* @ts-ignore */
        ...list,
        data: list.data.filter((prod: { name: string }) =>
          prod.name.toLowerCase().includes(filter.toLowerCase())
        ),
      }));
    } else {
      return [...listProducts];
    }
  }, [filter, listProducts]);

  const productsByCategory = useMemo(() => {
    const prods: ProductsNormalized[] = [];
    products
      .filter((prod) =>
        prod.name.toLowerCase().includes((filter ?? '').toLowerCase())
      )
      .forEach((prod) => {
        const idx = prods.findIndex(
          (itm) => itm.category.id === prod.productCategoryId
        );
        if (idx !== -1) {
          prods[idx].products.push(prod);
        } else {
          prods.push({
            category: {
              id: prod.productCategoryId,
              name: prod.productCategory,
            },
            products: [prod],
          });
        }
      });
    return prods;
  }, [filter, products]);

  const exportAction = (name) => {
    const dataToExport = [];
    filterProducts.forEach((item) => {
      dataToExport.push({
        ' ': item.title,
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
      if (item.data.length) {
        item.data.forEach((product) => {
          dataToExport.push({
            ' ': '  ' + product.name,
            'U/M': translateMeasure(product.measure),
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
                'U/M': translateMeasure(variation.measure),
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
  };

  return (
    <div className='mt-5 flex flex-col'>
      <div className='-my-2 -mx-4 overflow-x-auto overflow-y-visible sm:-mx-6 '>
        <div className='inline-block min-w-full align-middle md:px-4 lg:px-6'>
          <div className=' shadow ring-1 ring-black ring-opacity-5 md:rounded-lg my-1'>
            {listProducts.length ? (
              <table className='min-w-full'>
                <thead className='bg-white'>
                  <tr>
                    <th colSpan={10} className='px-3 pt-3.5 text-sm text-right'>
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
                                business,
                                { details, products: productsByCategory }
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
                        findAction={(match: React.SetStateAction<null>) =>
                          setFilter(match)
                        }
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
                        text='Unidad de medida'
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
                    if (item.data.length !== 0)
                      return (
                        <Fragment key={idx}>
                          <tr className='border-y-2 border-slate-200'>
                            <th
                              colSpan={10}
                              scope='colgroup'
                              className='bg-slate-100 px-2 py-3 text-left font-semibold text-slate-900 sm:px-6'
                            >
                              {item.title}
                            </th>
                          </tr>
                          {item.data.map(
                            (
                              product: {
                                inStock:
                                  | string
                                  | number
                                  | boolean
                                  | React.ReactElement<
                                      any,
                                      string | React.JSXElementConstructor<any>
                                    >
                                  | React.ReactFragment
                                  | null
                                  | undefined;
                                name:
                                  | string
                                  | number
                                  | boolean
                                  | React.ReactElement<
                                      any,
                                      string | React.JSXElementConstructor<any>
                                    >
                                  | React.ReactFragment
                                  | React.ReactPortal
                                  | null
                                  | undefined;
                                measure: string | undefined;
                                initial:
                                  | string
                                  | number
                                  | boolean
                                  | React.ReactElement<
                                      any,
                                      string | React.JSXElementConstructor<any>
                                    >
                                  | React.ReactFragment
                                  | React.ReactPortal
                                  | null
                                  | undefined;
                                entry: number;
                                movements: number;
                                outs: number;
                                waste: number;
                                processed: number;
                                sales: number;
                                onlineSales: string | number;
                                variations: any[];
                              },
                              productIdx: React.Key | null | undefined
                            ) => (
                              <Fragment key={productIdx}>
                                <tr
                                  className={classNames(
                                    productIdx === 0
                                      ? 'border-slate-300'
                                      : 'border-slate-200',
                                    //@ts-ignore
                                    product.inStock < 0 && 'bg-rose-200',
                                    'border-t hover:bg-orange-50'
                                  )}
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
                                    {product.movements !== 0 &&
                                      product.movements}
                                  </td>
                                  <td className='whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500'>
                                    {product.outs !== 0 && product.outs}
                                  </td>
                                  <td className='whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500'>
                                    {product.waste !== 0 && product.waste}
                                  </td>
                                  <td className='whitespace-nowrap text-center px-3 py-4 text-sm text-slate-500'>
                                    {product.processed !== 0 &&
                                      product.processed}
                                  </td>
                                  <td className='whitespace-nowrap px-3 py-4 text-center text-sm text-slate-500'>
                                    {`${
                                      product.sales !== 0 ? product.sales : ''
                                    } ${
                                      product.onlineSales !== 0
                                        ? '(' + product.onlineSales + ')'
                                        : ''
                                    }`}
                                  </td>
                                  <td className='whitespace-nowrap font-extrabold px-3 py-4 text-sm text-slate-600'>
                                    {product.inStock}
                                  </td>
                                </tr>

                                {product.variations.length !== 0 &&
                                  product.variations.map(
                                    (
                                      variation: {
                                        inStock:
                                          | string
                                          | number
                                          | boolean
                                          | React.ReactElement<
                                              any,
                                              | string
                                              | React.JSXElementConstructor<any>
                                            >
                                          | React.ReactFragment
                                          | null
                                          | undefined;
                                        name:
                                          | string
                                          | number
                                          | boolean
                                          | React.ReactElement<
                                              any,
                                              | string
                                              | React.JSXElementConstructor<any>
                                            >
                                          | React.ReactFragment
                                          | React.ReactPortal
                                          | null
                                          | undefined;
                                        initial:
                                          | string
                                          | number
                                          | boolean
                                          | React.ReactElement<
                                              any,
                                              | string
                                              | React.JSXElementConstructor<any>
                                            >
                                          | React.ReactFragment
                                          | React.ReactPortal
                                          | null
                                          | undefined;
                                        entry: number;
                                        movements: number;
                                        outs: number;
                                        waste: number;
                                        processed: number;
                                        sales: number;
                                        onlineSales: string | number;
                                      },
                                      idx: React.Key | null | undefined
                                    ) => (
                                      <tr
                                        key={idx}
                                        className={classNames(
                                          idx === 0
                                            ? 'border-slate-300'
                                            : 'border-slate-200',
                                          variation.inStock < 0 &&
                                            'bg-rose-200',
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
                                          {variation.entry !== 0 &&
                                            variation.entry}
                                        </td>
                                        <td className='whitespace-nowrap text-center px-3 py-4 text-xs text-slate-500'>
                                          {variation.movements !== 0 &&
                                            variation.movements}
                                        </td>
                                        <td className='whitespace-nowrap text-center px-3 py-4 text-xs text-slate-500'>
                                          {variation.outs !== 0 &&
                                            variation.outs}
                                        </td>
                                        <td className='whitespace-nowrap text-center px-3 py-4 text-xs text-slate-500'>
                                          {variation.waste !== 0 &&
                                            variation.waste}
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
                                              ? '(' +
                                                variation.onlineSales +
                                                ')'
                                              : ''
                                          }`}
                                        </td>
                                        <td className='whitespace-nowrap font-bold px-3 py-4 text-xs text-slate-600'>
                                          {variation.inStock}
                                        </td>
                                      </tr>
                                    )
                                  )}
                              </Fragment>
                            )
                          )}
                        </Fragment>
                      );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyList />
            )}
          </div>
        </div>
      </div>

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            exportAction={exportAction}
            close={() => setExportModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
