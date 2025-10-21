import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './routes/Dashboard';
import VulnDetail from './routes/VulnDetail';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vulnerability/:id" element={<VulnDetail />} />
      </Routes>
    </Router>
  );
};

export default App;