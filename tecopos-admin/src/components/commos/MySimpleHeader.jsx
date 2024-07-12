const MySimpleHeader = ({ text }) => {
  return (
    <header className="bg-white shadow">
      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between ">
        <h1 className="lg:text-2xl capitalize sm:text-sm font-medium text-gray-900">
          {text}
        </h1>
      </div>
    </header>
  );
};

export default MySimpleHeader;
