import {
  BarChart3,
  Package,
  ScrollText,
  ShoppingCart,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";

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
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Sistema SIMONE
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Gerencie seus clientes, produtos e pedidos de forma simples e
          eficiente
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.to}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all hover:scale-105 group"
          >
            <div
              className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
            >
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {action.title}
            </h3>
            <p className="text-muted-foreground">{action.description}</p>
          </Link>
        ))}
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link
          to="/clients"
          className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-light rounded-lg">
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
          className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-light rounded-lg">
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
          className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-light rounded-lg">
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

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Link
          to="/registrations"
          className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-light rounded-lg">
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
      <div className="bg-card border border-border rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
          EM BREVE: Recursos do Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-accent rounded-lg">
              <BarChart3 className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">
                Dashboard Completo
              </h3>
              <p className="text-sm text-muted-foreground">
                Visualize métricas importantes e estatísticas de vendas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
