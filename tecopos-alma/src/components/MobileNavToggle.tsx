interface MobileNavToggleProps {
  action: () => void;
 }
function MobileNavToggle({ action }: MobileNavToggleProps ) {
  return (
    <nav className="flex justify-between h-12 bg-gray-300 items-center px-4 md:hidden">
        <div onClick={action} className="flex flex-col gap-1 cursor-pointer text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"></path></svg>
        </div>
      </nav>
    );
}

export default MobileNavToggle
