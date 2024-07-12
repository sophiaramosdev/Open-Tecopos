import { createContext } from "react";
import {
  Control,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayUpdate,
} from "react-hook-form";
import { ReceiptBatchInterface } from "../../../../interfaces/ServerInterfaces";

interface ReceiptContextInterface {
  control?: Control;
  receipt?: ReceiptBatchInterface | null;
  fieldsProducts?: Record<"id" | string, any>;
  appendProduct?: UseFieldArrayAppend<Record<string, any>, "batches">;
  updateProduct?: UseFieldArrayUpdate<Record<string, any>, "batches">;
  removeProduct?: UseFieldArrayRemove;
  fieldsOperations?: Record<"id" | string, any>;
  appendOperation?: UseFieldArrayAppend<Record<string, any>, "operationsCosts">;
  updateOperation?: UseFieldArrayUpdate<Record<string, any>, "operationsCosts">;
  removeOperation?: UseFieldArrayRemove;
  fieldsDocuments?: Record<"id" | string, any>;
  appendDocument?: UseFieldArrayAppend<Record<string, any>, "listDocuments">;
  removeDocument?: UseFieldArrayRemove;
  dispatchReceipt?: (
    receiptId: number,
    data: Record<string, any>,
    callback?: Function
  ) => void;
  extractFoundsFrom?: (
    receiptId: number,
    data: Record<string, any>,
    callback?: Function
  ) => void;
  updateReceipt?: (
    id: number,
    data: Record<string, any>,
    callback?: Function
  ) => void;
  updateBatch?: (
    batchId: number,
    data: Record<string, any>,
    callback?:Function
  ) => void;
  addBatch?: (
    receiptId: number,
    data: Record<string, any>,
    callback?:Function
  ) => void;
  isFetching?: boolean;
  deleteBatch?:(batchId:number, callback?:Function)=>void,
  cancelReceipt?:(id:number, callback:Function)=>void,
  updateOuterList?:Function;
}

const ReceiptContext = createContext<ReceiptContextInterface>({});
export default ReceiptContext;
