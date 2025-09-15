import { useToast } from "@/hooks/use-toast";
import { api, Client, Order } from "@/services/api";
import {
  BadgeCheck,
  CircleX,
  ClockArrowUp,
  DollarSign,
  PencilLine,
  Plus,
  ScrollText,
  Search,
  Tag,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface OrderWithClient extends Order {
  client?: Client;
}

const OrderList = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // novo estado: se true => ordena por proximidade do vencimento
  const [sortByDue, setSortByDue] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, clientsRes] = await Promise.all([
        api.getOrders(),
        api.getClients(),
      ]);

      if (ordersRes.error) throw new Error(ordersRes.error);
      if (clientsRes.error) throw new Error(clientsRes.error);

      const ordersData = ordersRes.data || [];
      const clientsData = clientsRes.data || [];

      // Enrich orders with client data
      const enrichedOrders = ordersData.map((order) => ({
        ...order,
        client: clientsData.find((client) => client._id === order.customerId),
      }));

      setOrders(enrichedOrders);
      setClients(clientsData);
    } catch (error) {
      toast({
        title: "Erro ao carregar pedidos",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.client?.name?.toLowerCase() || "").includes(searchLower) ||
      (order.client?.cpf?.toLowerCase() || "").includes(searchLower) ||
      (order.client?.telephone || "").includes(searchTerm) ||
      order._id?.toLowerCase().includes(searchLower)
    );
  });

  // formatCurrency espera VALOR EM CENTAVOS
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Statistics (todos em CENTAVOS)
  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + (order.price || 0),
    0
  );
  const totalItems = filteredOrders.reduce(
    (sum, order) => sum + (order.totalAmount || 0),
    0
  );
  const averageOrderValue =
    filteredOrders.length > 0
      ? Math.round(totalRevenue / filteredOrders.length)
      : 0;

  // Receita pendente = soma dos valores em aberto (order.paid é o que falta, em centavos)
  const expectedRevenue = orders.reduce(
    (sum, order) => sum + (order.paid || 0),
    0
  );

  // --- Funções para calcular proximidade do vencimento ---

  // Retorna número de dias até o próximo vencimento.
  // Se não houver informação de 'installmentsTotal' retorna Infinity.
  const getDaysUntilDue = (order: OrderWithClient): number => {
    const dueRaw = order.installmentsTotal;
    if (!dueRaw && dueRaw !== 0) return Infinity; // sem dia de vencimento
    const dueDay = Number(dueRaw);
    if (Number.isNaN(dueDay) || dueDay <= 0) return Infinity;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // cria data do vencimento no mês atual com cuidado para meses curtos
    const clampDayForMonth = (y: number, m: number, day: number) => {
      const lastDay = new Date(y, m + 1, 0).getDate();
      return Math.min(day, lastDay);
    };

    let candidate = new Date(
      year,
      month,
      clampDayForMonth(year, month, dueDay),
      23,
      59,
      59
    );

    // se já passou no mês atual, usar próximo mês
    if (candidate < now) {
      const nextMonth = new Date(year, month + 1, 1);
      const nextYear = nextMonth.getFullYear();
      const nextMonthIndex = nextMonth.getMonth();
      candidate = new Date(
        nextYear,
        nextMonthIndex,
        clampDayForMonth(nextYear, nextMonthIndex, dueDay),
        23,
        59,
        59
      );
    }

    const diffMs = candidate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  // comparator usado quando sortByDue === true
  const compareByDue = (a: OrderWithClient, b: OrderWithClient) => {
    // Empurra pedidos totalmente pagos para o final (paid === 0 significa sem dívida)
    const aPaidFlag = (a.paid || 0) === 0 ? 1 : 0;
    const bPaidFlag = (b.paid || 0) === 0 ? 1 : 0;
    if (aPaidFlag !== bPaidFlag) return aPaidFlag - bPaidFlag;

    const aDays = getDaysUntilDue(a);
    const bDays = getDaysUntilDue(b);

    if (aDays === bDays) {
      // fallback para data de criação (mais recente por último ou ajuste à sua preferência)
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return aDays - bDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Criamos uma cópia e ordenamos conforme o modo (por vencimento ou por data)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortByDue) return compareByDue(a, b);
    // comportamento anterior: ordenar por data (mais recente primeiro)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os pedidos
          </p>
        </div>
        <Link
          to="/orders/new"
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card flex items-center border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Receita Total</div>
              <div className="text-[17px] lg:text-xl font-bold text-foreground">
                {formatCurrency(totalRevenue)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card flex items-center border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-lg">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Total de Pedidos
              </div>
              <div className="text-xl font-bold text-foreground">
                {filteredOrders.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card flex items-center border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-lg">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Itens Vendidos
              </div>
              <div className="text-xl font-bold text-foreground">
                {totalItems}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card flex items-center border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-lg">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ticket Médio</div>
              <div className="text-[17px] lg:text-xl font-bold text-foreground">
                {formatCurrency(averageOrderValue)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card flex items-center border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-lg">
              <ClockArrowUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Receita pendente
              </div>
              <div className="text-[17px] lg:text-xl font-bold text-foreground">
                {formatCurrency(expectedRevenue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + botão de ordenação por vencimento */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente, telefone ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <button
          type="button"
          onClick={() => setSortByDue((s) => !s)}
          className={`mt-3 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
            sortByDue
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border"
          }`}
          title="Ordenar por proximidade do vencimento"
        >
          <ClockArrowUp className="h-4 w-4" />
          {sortByDue ? "Ordenando por vencimento" : "Ordenar por vencimento"}
        </button>
      </div>

      {/* Orders list */}
      {sortedOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-muted-foreground mb-4">
            {searchTerm
              ? "Nenhum pedido encontrado"
              : "Nenhum pedido registrado"}
          </div>
          {!searchTerm && (
            <Link
              to="/orders/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Criar primeiro pedido
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4 flex flex-col">
          {sortedOrders.map((order) => (
            <Link to={`${order._id}/edit`} key={order._id}>
              <div className="group bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {order.client?.name || "Cliente não encontrado"}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">CPF:</span>{" "}
                        {order.client?.cpf || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Data:</span>{" "}
                        {formatDate(order.date)}
                      </div>
                      <div>
                        <span className="font-medium">Itens:</span>{" "}
                        {order.totalAmount}
                      </div>
                      <div>
                        <span className="font-medium">Vencimento:</span>{" "}
                        {order.installmentsTotal
                          ? `dia ${order.installmentsTotal}`
                          : "-"}
                        <div className="mt-2">
                          {order.paid === 0 ? (
                            <div className="inline-flex items-center gap-2 text-sm text-green-600">
                              <BadgeCheck className="w-5 h-5" />
                              <span className="font-medium">Pago</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 text-sm text-destructive">
                              <CircleX className="w-5 h-5" />
                              <span className="font-medium">
                                Em aberto: {formatCurrency(order.paid || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {order.client?.telephone && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Telefone: {order.client.telephone}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {formatCurrency(order.price || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>
                        Valor já pago:{" "}
                        {formatCurrency(order.installmentsPaid || 0)}
                      </div>

                      {/* mostra quantos dias faltam até o próximo vencimento (se disponível) */}
                      {order.installmentsTotal && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Próx. venc.: {getDaysUntilDue(order)} dia(s)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order items preview */}
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Produtos:</span>{" "}
                    {order.items.length} tipo(s) de produto
                  </div>
                  <div className="group-hover:opacity-100 transition-opacity duration-300 opacity-0 bg-primary-light p-2 rounded-lg">
                    <PencilLine className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderList;
