import { useState } from "react";
import SideBar from "../components/app/SideBar";
import Navbar from "../components/app/Navbar";
import { Outlet } from "react-router-dom";
import { Loading } from "../components";
import { useAppSelector } from "../store/hooks";
import { ErrorBoundary } from "react-error-boundary";
import ErrorPage from "../pages/ErrorPage";
import "react-toastify/dist/ReactToastify.css";

const AppContainer = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const switchSideBar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const { loading } = useAppSelector((state) => state.init);
  const { staticBar } = useAppSelector((state) => state.session);

  if (loading) return <Loading />;
  return (
    <div className="h-full w-full">
      <ErrorBoundary fallback={<ErrorPage />}>
        <Navbar />
        <SideBar barState={sidebarOpen} switchSideBar={switchSideBar} />
        <div
          className={`fixed w-full ${
            staticBar ? "md:pl-64" : "md:pl-20"
          } pt-24 md:pt-16 h-full`}
        >
          <main className="sm:px-2 md:px-4 lg:px-8 py-5 h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300">
            <Outlet />
          </main>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default AppContainer;
