import { api } from "@/services/api";
import {
  LogOut,
  Menu,
  Package,
  ScrollText,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import BlueHeartHori from "@/assets/BLUEHEARTHORIZONTAL.svg";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  const navigation = [
    { name: "Clientes", to: "/clients", icon: Users },
    { name: "Produtos", to: "/products", icon: Package },
    { name: "Pedidos", to: "/orders", icon: ShoppingCart },
    { name: "Registros", to: "/registrations", icon: ScrollText },
    // { name: "Importar Contatos", to: "/", icon: Users },
  ];

  useEffect(() => {
    if (!api.isAuthenticated()) {
      navigate("/login");
    }
  }, []);

  const logout = () => {
    api.logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-64 transform border-r border-border bg-card transition-transform lg:inset-0 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} `}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <Link to={"/"}>
            {/* <h1 className="text-xl font-bold text-primary">
              Sistema {import.meta.env.VITE_SYSTEM_NAME}
            </h1> */}
            <img src={BlueHeartHori} alt="" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-2 hover:bg-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2 p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
          <div
            onClick={logout}
            className="absolute bottom-4 left-4 flex w-[85%] cursor-pointer items-center justify-start gap-3 rounded-sm bg-blue-500/50 px-3 py-3 text-white transition-colors duration-300 ease-in-out hover:bg-red-500"
          >
            <LogOut />
            <span>Sair da conta</span>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <div className="border-b border-border bg-card p-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
