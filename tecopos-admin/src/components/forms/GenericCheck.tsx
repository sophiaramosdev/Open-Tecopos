import React, { useState } from "react";

interface CheckProps {
  value: number | string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  checked?: boolean;
  defaultChecked?: boolean;
  label?: string; }

const Check = ({
  value,
  onChange,
  checked,
  defaultChecked,
  label, 
}: CheckProps) => {
  const [input, setInput] = useState(checked ?? false);
  return (
    <div className="flex items-center"> 
      <input
        name={""}
        type="checkbox"
        className="h-4 w-4 rounded cursor-pointer border-gray-500 focus:bg-transparent text-slate-600 focus:ring-transparent"
        onChange={(e) => {
          onChange && onChange(e);
          setInput(!!e);
        }}
        defaultChecked={defaultChecked}
        value={value}
        checked={checked}
      />
      {label && <span className="ml-2">{label}</span>} 
    </div>
  );
};

export default Check;
