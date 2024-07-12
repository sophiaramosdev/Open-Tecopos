import React, { useContext } from "react";
import ReceiptContext from "../ReceiptContext";

const Operations = () => {
  const { receipt } = useContext(ReceiptContext);
  return (
    <div className="h-full overflow-auto scrollbar-none p-3">Operations</div>
  );
};

export default Operations;
