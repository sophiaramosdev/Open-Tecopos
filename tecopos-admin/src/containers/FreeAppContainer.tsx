import React, {useState, useEffect} from 'react'
import SideBar from '../components/app/SideBar';
import Navbar from '../components/app/Navbar';
import { Outlet } from 'react-router-dom';
import useInitialLoad from "../api/useInitialLoad"
import { ErrorBoundary } from 'react-error-boundary';
import ErrorPage from '../pages/ErrorPage';
import { useAppSelector } from '../store/hooks';

const FreeAppContainer = () => {
  const {initLoad}= useInitialLoad()

  useEffect(() => {
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { staticBar } = useAppSelector((state) => state.session);
  

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const switchSideBar = () => {
    setSidebarOpen(!sidebarOpen);
  };

    return (
        <div className="h-full w-full">
          <ErrorBoundary fallback={<ErrorPage />}>
          <Navbar />
          <SideBar barState={sidebarOpen} switchSideBar={switchSideBar} />      
          <div className={`fixed w-full ${
            staticBar ? "md:pl-64" : "md:pl-20"
          } pt-24 md:pt-16 h-full`}>                
            <main className="flex-1">
              <div className="py-3">
                <div className="mx-auto max-w-full px-4 sm:px-6 md:px-8">
                  <Outlet />
                </div>
              </div>
            </main>
          </div>
          </ErrorBoundary>
          
        </div>
      );
    };

export default FreeAppContainer