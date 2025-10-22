import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import { setData, setQuery, toggleKaiFilter } from './features/vulns/slice';
// import './index.css';
// import { streamIntoDB, getAllVulnerabilities } from './data/loader';

// (async () => {
//   console.log('⏳ Starting data stream...');
//   await streamIntoDB('/ui_demo.json');
//   const vulns = await getAllVulnerabilities();
//   console.log(`✅ Stored ${vulns.length} vulnerabilities`);
//   console.log(vulns.slice(0, 3)); // view sample
// })();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);


// state-mamagement test

// store.dispatch(setData([{
//   id: '1', cve: 'CVE-123', severity: 'high',
//   package: ''
// }]));
// console.log('All vulns:', store.getState().vulns.all);

// store.dispatch(setQuery('123'));
// console.log('Filtered vulns:', store.getState().vulns.filtered);

// store.dispatch(toggleKaiFilter('invalid - norisk'));
// console.log('Kai filters:', store.getState().vulns.kaiExclude);
