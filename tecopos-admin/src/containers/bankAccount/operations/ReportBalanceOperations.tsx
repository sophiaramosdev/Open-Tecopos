import { useForm, SubmitHandler } from "react-hook-form";

import { useAppSelector } from "../../../store/hooks";

import { SelectInterface } from "../../../interfaces/InterfacesLocal";

import LoadingSpin from "../../../components/misc/LoadingSpin";
import Select from "../../../components/forms/Select";
import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";
import TextArea from "../../../components/forms/TextArea";
import ComboBox from "../../../components/forms/Combobox";
import { ReportInterface } from "../../../components/misc/ReportsComponent";


interface NewOperationProp {
  
  report: ReportInterface[];
}

const ReportBalanceOperations = ({ report }: NewOperationProp) => {
 
  //--------------------------------------------------------------------------------------------

  return (

    <>
        <div className="mt-5 flex flex-col py-10">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 ">
                <div className="inline-block min-w-full py-2 align-middle md:px-4 lg:px-8">
                    <div className="">
                        <table className="min-w-full">
                            <tbody className="text-center">
                                <tr>
                                    {report.map((stat) => (
                                        <td key={stat.name}>
                                            <div  className="mx-auto flex max-w-xs flex-col gap-y-6">
                                                <dt className="text-base leading-7 text-gray-600">{stat.name}</dt>
                                                <dd className={`order-first font-semibold tracking-tight text-${stat.color ? stat.color :"gray-600"} sm:text-3xl lg:text-xl xl:text-3xl`}>
                                                    {stat.value}
                                                </dd>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>    
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default ReportBalanceOperations;
