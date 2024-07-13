import { Route, Routes } from 'react-router-dom';
import ListBusiness from '../containers/business/ListBusiness';
import BusinessContainer from '../containers/business/DetailBusinessContainer';
import NotFoundpage from '../pages/NotFoundPage';
import Dashboard from '../pages/DashboardPage';
import 'react-toastify/dist/ReactToastify.css';
import ListBilling from '../containers/business/businessDetails/billing/ListBilling';
import AppContainer from '../containers/AppContainer';
import ListUser from '../containers/users/ListUser';

const AppRoute = () => {
  return (
    <Routes>
      <Route path='/' element={<AppContainer />}>
        <Route index element={<Dashboard />} />
        <Route path='business' element={<ListBusiness />} />
        <Route path='business/:businessId' element={<BusinessContainer />} />
        <Route path='billing' element={<ListBilling />} />
        <Route path='users' element={<ListUser />} />
      </Route>
      <Route path='/*' element={<NotFoundpage />} />
    </Routes>
  );
};

export default AppRoute;
