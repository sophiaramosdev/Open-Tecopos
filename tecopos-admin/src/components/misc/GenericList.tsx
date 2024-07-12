import LoadingSpin from "./LoadingSpin";
import { ReportInterface } from "./ReportsComponent";

export interface ListHeader {
  title: string;
  subtitle?: string | React.ReactNode;
  alert?: boolean,
}

export interface ActionBtnInterface {
  icon: React.ReactNode;
  btnColor?: string;
  action: Function;
}

interface GenericListInterface {
  header?: ListHeader;
  body: Record<string, string | number | React.ReactNode> | ReportInterface[];
  actionBtn?: ActionBtnInterface | ActionBtnInterface[];
  isLoading?: boolean;
  lastRowColor?: string;
}

export default function GenericList({ header, body, actionBtn, isLoading, lastRowColor }: GenericListInterface) {

  return (
    //header
    <>
      {
        isLoading ?? false
          ? <div className="w-full h-full flex justify-center items-center">
            <LoadingSpin color="black" />
          </div>
          : <div className='overflow-hidden bg-white shadow sm:rounded-lg'>

            <div className={`flex justify-between ${header?.alert ? 'bg-red-50' : 'bg-gray-50'} items-center pr-5`}>
              {header && (
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg font-medium leading-6 text-gray-900'>
                    {header.title}
                  </h3>
                  {typeof header.subtitle === 'string' ? (
                    <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                      {header.subtitle}
                    </p>
                  ) : (
                    <div className="mt-1 max-w-2xl text-sm text-gray-500">{header.subtitle}</div>

                  )}
                </div>
              )}
              {actionBtn && (actionBtn && Array.isArray(actionBtn) ? (
                <div className={`grid grid-cols-${actionBtn.length} gap-5`}>
                  {actionBtn.map((item, key) => (
                    <button key={key}
                      className={`inline-flex items-center rounded border border-inherit bg-${item.btnColor} px-2.5 py-1.5 text-xs font-medium text-${item.btnColor}-100 shadow-sm hover:bg-${item.btnColor}-700 focus:outline-none focus:ring-2 focus:ring-${item.btnColor}-500 focus:ring-offset-2`}
                      onClick={() => item.action()}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              ) : <button
                className={`inline-flex items-center rounded border border-transparent bg-${actionBtn.btnColor}-500 px-2.5 py-1.5 text-xs font-medium text-${actionBtn.btnColor}-100 shadow-sm hover:bg-${actionBtn.btnColor}-700 focus:outline-none focus:ring-2 focus:ring-${actionBtn.btnColor}-500 focus:ring-offset-2`}
                onClick={() => actionBtn.action()}
              >
                {actionBtn.icon}
              </button>)}
            </div>

            <div className='border-t border-gray-200'>
              <dl>
                {Object.entries(body).map((item, idx) => {
                  return (
                    <div key={idx}>
                      {typeof item[1] === 'string' || typeof item[1] === 'number' || typeof item[1] === null ? (
                        <div
                          key={idx}
                          className={`${idx % 2 !== 0 && "bg-gray-100"
                            } px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 scrollbar-thin`}
                        >
                          <dt className='text-sm font-medium text-gray-500'>
                            {item[0]}
                          </dt>
                          <dd className={`mt-1 text-sm ${(lastRowColor !== undefined && lastRowColor !== null && Object.entries(body).length === (idx + 1)) ? ("text-" + lastRowColor) : "text-gray-900"} sm:col-span-2 sm:mt-0`}>
                            {item[1]}
                          </dd>
                        </div>
                      ) : (
                        <div className={`
                ${idx % 2 !== 0 && "bg-gray-100"} 
                px-4 py-5 lg:px-6`}>
                          <dt className="text-sm font-medium text-gray-500 text flex items-center">
                            {item[0]}
                          </dt>
                          <dd className={`mt-1 text-sm ${(lastRowColor !== undefined && lastRowColor !== null && Object.entries(body).length === (idx + 1)) ? ("text-" + lastRowColor) : "text-gray-900"} sm:col-span-2`}>{item[1]}</dd>
                        </div>
                      )}
                    </div>
                  )
                })}
              </dl>
            </div>
          </div>
      }
    </>


  );
}
