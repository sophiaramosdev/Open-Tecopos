import { LineChart } from '../misc/Chart';
import { translateDayName, translateMonthName } from '../../utils/helpers';
import { useEffect, useState } from 'react';
import useServerBusiness from '../../api/useServerBusiness';
import moment from 'moment/moment';
import SpinnerLoading from '../misc/SpinnerLoading';

const RegisteredBusinessChart = () => {
  const [mode, setMode] = useState('month');
  const { getRegisteredBusiness, reports, isLoading } = useServerBusiness();

  useEffect(() => {
    const fetchData = async () => {
      await getRegisteredBusiness!(mode);
    };
    fetchData();
  }, [mode]);

  // TODO Temporary solutions for temporary issues--------------------------------------------------------------------
  // @ts-ignore
  let registeredBusinessReport = reports ? [...reports] : [];
  if (registeredBusinessReport.length) {
    registeredBusinessReport = registeredBusinessReport.filter(
      (report) => report.date
    );
    registeredBusinessReport.sort((a, b) => {
      if (a.date > b.date) return 1;
      return -1;
    });
  }
  // -----------------------------------------------------------------------------------------------------------------

  let dateRangeToChart = '';
  if (registeredBusinessReport.length) {
    dateRangeToChart =
      'del ' +
      moment(registeredBusinessReport[0].date).format('D [de] MMMM') +
      ' al ' +
      moment(
        registeredBusinessReport[registeredBusinessReport.length - 1].date
      ).format('D [de] MMMM');
  }
  return (
    <>
      <span className='isolate inline-flex rounded-md shadow-sm'>
        <button
          type='button'
          onClick={() => setMode('year')}
          className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 ${
            mode === 'year' ? 'bg-gray-100' : 'bg-white'
          }`}
        >
          Año
        </button>
        <button
          type='button'
          onClick={() => setMode('month')}
          className={`relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 ${
            mode === 'month' ? 'bg-gray-100' : 'bg-white'
          }`}
        >
          Mes
        </button>
        <button
          type='button'
          onClick={() => setMode('week')}
          className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 ${
            mode === 'week' ? 'bg-gray-100' : 'bg-white'
          }`}
        >
          Semana
        </button>
      </span>
      {isLoading ? (
        <SpinnerLoading text='Cargando reporte' />
      ) : (
        <LineChart
          name='Negocios registrados'
          // @ts-ignore
          dataShow={registeredBusinessReport?.map(
            (report: any) => report.quantity
          )}
          title={`Negocios Registrados ${dateRangeToChart}`}
          // @ts-ignore
          xlabels={registeredBusinessReport.map((report: any) => {
            switch (mode) {
              case 'year':
                return translateMonthName(report.month);
              case 'month':
                return report.date;
              case 'week':
                return translateDayName(report.day);
              default:
                report.number.toString();
            }
          })}
        />
      )}
    </>
  );
};

export default RegisteredBusinessChart;
