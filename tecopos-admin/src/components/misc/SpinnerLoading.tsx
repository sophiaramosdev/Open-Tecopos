import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface Spinner {
  font_size_loading?: string;
  font_size_text?: string;
  className?: string;
  text?: string;
}

const SpinnerLoading = ({
  text,
  className,
  font_size_loading = "h-10 w-10 animate-spin text-slate-500",
  font_size_text = "text-sm font-medium text-gray-500 mt-3 animate-pulse",
}: Spinner) => {
  return (
    <div className={`text-center mt-5 ${className && className}`}>
      <FontAwesomeIcon
        icon={faSpinner}
        className={`${font_size_loading}`}
        aria-hidden="true"
      />
      <h3 className={`${font_size_text}`}>{text ? text : "Cargando..."}</h3>
    </div>
  );
};

export default SpinnerLoading;
