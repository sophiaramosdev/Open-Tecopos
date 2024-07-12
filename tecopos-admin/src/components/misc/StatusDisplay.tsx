import LoadingSpin from "./LoadingSpin"

  interface StatusItems{
    name:string,
    state:string | number,
    action?:Function    
  }

  interface StatusDisplay{
    data:StatusItems[],
    loading?:boolean
  }


  
  export default function StatusDisplay({data, loading}:StatusDisplay) {
    return (
      <div>
        <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-3 flex-shrink">
          {data.map((item) => (
            <div key={item.name} className={`overflow-hidden rounded-lg bg-white px-3 py-1 shadow sm:px-2 ${item.action ? "cursor-pointer" : ""}`} onClick={()=>item.action && item.action()}>
              <dt className="truncate text-sm font-medium text-gray-500 text-center">{item.name}</dt>
              {loading ? <div className="flex justify-center"><LoadingSpin color="gray-800"/></div>  : <dd className="text-lg font-semibold tracking-tight text-gray-900 text-center">{item.state}</dd>}
              
            </div>
          ))}
        </dl>
      </div>
    )
  }
  