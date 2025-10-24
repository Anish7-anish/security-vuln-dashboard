import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Layout, Menu } from "antd";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import VulnDetail from "./pages/VulnDetail";
import { enableMapSet } from 'immer';   // ✅ add this
enableMapSet();  

const { Header, Content } = Layout;

export default function App() {
  return (
    <BrowserRouter>
      <Layout style={{minHeight: '100vh'}}>
        <Header
          style={{
            background: 'linear-gradient(135deg, #0f3a5a 0%, #081a2e 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Menu theme="dark" mode="horizontal" style={{ background: 'transparent' }}>
            <Menu.Item key="1">
              <NavLink to="/">Dashboard</NavLink>
            </Menu.Item>
            <Menu.Item key="2">
              <NavLink to="/search">Search</NavLink>
            </Menu.Item>
          </Menu>
        </Header>

        <Content style={{ minHeight: "calc(100vh - 64px)" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/vuln/:id" element={<VulnDetail />} />
          </Routes>
        </Content>
      </Layout>
    </BrowserRouter>
  );
}
