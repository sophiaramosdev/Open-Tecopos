import React from "react";
import { Link } from "react-scroll";

export const CardCategory = ({ category, onClick }) => {
  return (
    <Link
      activeClass="active"
      to={category.name}
      spy={true}
      smooth={true}
      offset={-250}
      duration={200}
      key={category.name}
      onClick={() => onClick()}
      className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-lg scrollbar-hide  overflow-hidden  p-6 hover:opacity-75  shadow-sm inline-block  cursor-pointer  ease-in-out duration-300 "
    >
      <span aria-hidden="true" className="absolute inset-0">
        <img
          src={category.image?.src}
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-800 opacity-50"
      />
      <span className="absolute inset-x-0 bottom-4 left-2 truncate  text-lg font-bold text-white">
        {category.name}
      </span>
    </Link>
  );
};
