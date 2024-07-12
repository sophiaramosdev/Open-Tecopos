  
  const LogoComponent = () => {
    return (
      <div className="flex h-full w-full justify-center items-center">
        <div className="relative h-full w-full grid grid-cols-2 grid-rows-2 gap-[8%] shadow-inner">
          <div className="bg-slate-800  text-slate-800 h-full w-full"></div>
          <div className="bg-slate-800 text-slate-800 h-full w-full"></div>
          <div className="bg-slate-800  text-slate-800 h-full w-full"></div>
          <div className="bg-orange-600 rounded-full h-full w-full"></div>          
        </div>
      </div>
    );
  };
  export default LogoComponent;