import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { persistor, store } from './store/root';
import reportWebVitals from './reportWebVitals';
import './index.css';
import { MainRoute } from './routes/MainRoute';
import { injectStore } from './api/APIServices';
import { injectMediaStore } from './api/APIMediaServer';
import { PersistGate } from 'redux-persist/integration/react';

injectStore(store);
injectMediaStore(store);
const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
	<Provider store={store}>
		<PersistGate persistor={persistor}>
			<MainRoute />
		</PersistGate>
	</Provider>,
);

reportWebVitals();
