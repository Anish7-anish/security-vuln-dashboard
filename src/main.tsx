import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
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