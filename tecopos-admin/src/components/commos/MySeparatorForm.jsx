import React from "react";

const MySeparatorForm = ({ text, initial }) => {
  return (
    <div
      className={`${
        !initial ? "mt-6 mb-4" : "my-4"
      }  flex items-center justify-center relative`}
    >
      <div className="w-full h-[1px] bg-gray-300" />
      <span className="bg-white px-2 absolute text-sm text-gray-500 capitalize">
        {text}
      </span>
    </div>
  );
};

export default MySeparatorForm;
