import Footer from "@/components/Footer";
import {
  BarChart3,
  Package,
  ScrollText,
  ShoppingCart,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import BlueHeartHori from "@/assets/BlueHeartHorizontalShadow.svg";

const Index = () => {
  const quickActions = [
    {
      title: "Novo Cliente",
      description: "Cadastrar um novo cliente",
      icon: Users,
      to: "/clients/new",
      color: "bg-blue-500",
    },
    {
      title: "Novo Produto",
      description: "Adicionar produto ao estoque",
      icon: Package,
      to: "/products/new",
      color: "bg-green-500",
    },
    {
      title: "Novo Pedido",
      description: "Criar um novo pedido",
      icon: ShoppingCart,
      to: "/orders/new",
      color: "bg-purple-500",
    },
    {
      title: "Novo Registro",
      description: "Registrar uma anotação financeira",
      icon: ScrollText,
      to: "/registrations/new",
      color: "bg-yellow-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="pb-12 text-center flex flex-col items-center">
        {/* <h1 className="mb-4 text-4xl font-bold text-foreground">
          Sistema {import.meta.env.VITE_SYSTEM_NAME}
        </h1> */}
        <img src={BlueHeartHori} className="w-80 mb-10" alt="" />
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Gerencie seus clientes, produtos e pedidos de forma simples e
          eficiente
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.to}
            className="group rounded-lg border border-border bg-card p-6 transition-all hover:scale-105 hover:shadow-lg"
          >
            <div
              className={`h-12 w-12 ${action.color} mb-4 flex items-center justify-center rounded-lg transition-transform group-hover:scale-110`}
            >
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {action.title}
            </h3>
            <p className="text-muted-foreground">{action.description}</p>
          </Link>
        ))}
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Link
          to="/clients"
          className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-lg bg-primary-light p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Clientes
              </h3>
              <p className="text-sm text-muted-foreground">
                Gerencie sua base de clientes
              </p>
            </div>
          </div>
          <div className="text-sm text-primary group-hover:underline">
            Ver todos os clientes →
          </div>
        </Link>

        <Link
          to="/products"
          className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-lg bg-primary-light p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Produtos
              </h3>
              <p className="text-sm text-muted-foreground">
                Controle seu estoque
              </p>
            </div>
          </div>
          <div className="text-sm text-primary group-hover:underline">
            Ver todos os produtos →
          </div>
        </Link>

        <Link
          to="/orders"
          className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-lg bg-primary-light p-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Pedidos</h3>
              <p className="text-sm text-muted-foreground">
                Acompanhe suas vendas
              </p>
            </div>
          </div>
          <div className="text-sm text-primary group-hover:underline">
            Ver todos os pedidos →
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
        <Link
          to="/registrations"
          className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-lg bg-primary-light p-3">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Registros Financeiros
              </h3>
              <p className="text-sm text-muted-foreground">
                Controle de entradas e saídas
              </p>
            </div>
          </div>
          <div className="text-sm text-primary group-hover:underline">
            Ver todos os registros →
          </div>
        </Link>
      </div>

      {/* Features Overview */}
      <div className="rounded-lg border border-border bg-card p-8">
        <h2 className="mb-6 text-center text-2xl font-semibold text-foreground">
          EM BREVE: Recursos do Sistema
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-accent p-2">
              <BarChart3 className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="mb-1 font-medium text-foreground">
                Dashboard Completo
              </h3>
              <p className="text-sm text-muted-foreground">
                Visualize métricas importantes e estatísticas de vendas
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* <InputContacts /> */}
      <Footer />
    </div>
  );
};

export default Index;
