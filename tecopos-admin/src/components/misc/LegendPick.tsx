import React from "react";

interface Legend {
  className?: string;
  text: String;
}

const LegendPick = ({ className, text }: Legend) => {
  return (
    <div className={className ? className : ""}>
      <div className="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 shadow-md text-center">
        {text}
      </div>
    </div>
  );
};

export default LegendPick;
