import { useToast } from "@/hooks/use-toast";
import { api, Client, Order } from "@/services/api";
import {
  BadgeCheck,
  CircleX,
  ClockArrowUp,
  DollarSign,
  Plus,
  ScrollText,
  Search,
  Tag,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Hashids from "hashids";
// import { encode } from "punycode";

interface OrderWithClient extends Order {
  client?: Client;
}

const hashids = new Hashids("sistema", 6);

const OrderList = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortByDue, setSortByDue] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();

    // const encoded = hashids.encode(123);
    // console.log(encoded); // exemplo: "NkK9"

    // const decoded = hashids.decode("BZdKNo");
    // console.log(decoded[0]); // [123]
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
    0,
  );
  const totalItems = filteredOrders.reduce(
    (sum, order) => sum + (order.totalAmount || 0),
    0,
  );
  const averageOrderValue =
    filteredOrders.length > 0
      ? Math.round(totalRevenue / filteredOrders.length)
      : 0;

  // Receita pendente = soma dos valores em aberto (order.paid é o que falta, em centavos)
  const expectedRevenue = orders.reduce(
    (sum, order) => sum + (order.paid || 0),
    0,
  );

  // --- Funções para calcular proximidade do vencimento ---

  // Retorna número de dias até o próximo vencimento.
  // Se não houver informação de 'installmentsTotal' retorna Infinity.
  // --- Substitua as funções getDaysUntilDue + compareByDue por estas ---

  // Retorna true se houver qualquer pagamento no mês e ano atuais
  const hasPaymentThisMonth = (order: OrderWithClient) => {
    if (!order.paymentHistory || !Array.isArray(order.paymentHistory))
      return false;
    const now = new Date();
    return order.paymentHistory.some((ph) => {
      try {
        const d = new Date(ph.date);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      } catch {
        return false;
      }
    });
  };

  // Retorna um objeto com informações sobre o próximo vencimento:
  // { candidateDate: Date | null, daysUntilDue: number (>=0 if future), overdue: boolean, daysOverdue: number (>=0), nextInstallmentNumber?: number, nextInstallmentAmount?: number }
  // Faz *primeiro* tentativa por order.installments (próxima parcela não-paga).
  // Se não encontrar installments válidos, faz fallback para o antigo comportamento baseado em installmentsTotal (dia do mês).
  const computeDueInfo = (order: OrderWithClient) => {
    // Helper safe parse date
    const parseDateSafe = (d: any) => {
      if (!d) return null;
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    };

    // 1) Se houver installments (array de subdocumentos) -> encontrar próxima parcela NÃO paga
    if (
      order.installments &&
      Array.isArray(order.installments) &&
      order.installments.length > 0
    ) {
      // considerar parcelas com dueDate válido
      const unpaidWithDates = order.installments
        .filter((inst) => !inst || inst.status !== "pago") // manter elementos falsy? filtramos depois
        .map((inst) => ({
          inst,
          due: parseDateSafe(inst?.dueDate),
        }))
        .filter((x) => x.due); // só com data válida

      if (unpaidWithDates.length > 0) {
        // ordenar por dueDate asc
        unpaidWithDates.sort((a, b) => a.due.getTime() - b.due.getTime());
        const next = unpaidWithDates[0];
        const candidate = next.due;
        const now = new Date();
        const diffMs = candidate.getTime() - now.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const daysUntilDueRaw = Math.ceil(diffMs / oneDay);
        const daysUntilDue = daysUntilDueRaw >= 0 ? daysUntilDueRaw : 0;
        const overdue = candidate.getTime() < now.getTime();
        const daysOverdue = overdue
          ? Math.ceil((now.getTime() - candidate.getTime()) / oneDay)
          : 0;

        return {
          candidateDate: candidate,
          daysUntilDue,
          overdue,
          daysOverdue,
          nextInstallmentNumber: Number(next.inst?.number) || null,
          nextInstallmentAmount: Number(next.inst?.amount) || null,
        };
      }

      // se não houver parcela não-paga com data válida -> significa que todas têm data inválida ou não existem não-pagas
      return {
        candidateDate: null,
        daysUntilDue: Infinity,
        overdue: false,
        daysOverdue: 0,
        nextInstallmentNumber: null,
        nextInstallmentAmount: null,
      };
    }

    // 2) Fallback para comportamento antigo (quando não há installments): usar installmentsTotal como dia do mês
    const dueRaw = order.installmentsTotal;
    if (!dueRaw && dueRaw !== 0)
      return {
        candidateDate: null,
        daysUntilDue: Infinity,
        overdue: false,
        daysOverdue: 0,
        nextInstallmentNumber: null,
        nextInstallmentAmount: null,
      };

    const dueDay = Number(dueRaw);
    if (Number.isNaN(dueDay) || dueDay <= 0)
      return {
        candidateDate: null,
        daysUntilDue: Infinity,
        overdue: false,
        daysOverdue: 0,
        nextInstallmentNumber: null,
        nextInstallmentAmount: null,
      };

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const clampDayForMonth = (y: number, m: number, day: number) => {
      const lastDay = new Date(y, m + 1, 0).getDate();
      return Math.min(day, lastDay);
    };

    // decide se usamos este mês ou próximo mês como candidato
    const paidThisMonth = hasPaymentThisMonth(order);

    let candidate: Date;
    if (paidThisMonth) {
      // próximo mês
      const next = new Date(year, month + 1, 1);
      const nextYear = next.getFullYear();
      const nextMonthIndex = next.getMonth();
      candidate = new Date(
        nextYear,
        nextMonthIndex,
        clampDayForMonth(nextYear, nextMonthIndex, dueDay),
        23,
        59,
        59,
      );
    } else {
      // tenta no mês atual (com clamp). Se já passou, candidate ficará no mês atual (será detectado como overdue)
      candidate = new Date(
        year,
        month,
        clampDayForMonth(year, month, dueDay),
        23,
        59,
        59,
      );
    }

    const diffMs = candidate.getTime() - now.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const daysUntilDue = Math.ceil(diffMs / oneDay); // pode ser <= 0 se já passou
    const overdue = !paidThisMonth && candidate.getTime() < now.getTime();
    const daysOverdue = overdue
      ? Math.ceil((now.getTime() - candidate.getTime()) / oneDay)
      : 0;

    return {
      candidateDate: candidate,
      daysUntilDue: daysUntilDue >= 0 ? daysUntilDue : 0,
      overdue,
      daysOverdue,
      nextInstallmentNumber: null,
      nextInstallmentAmount: null,
    };
  };

  // Comparator atualizado para priorizar:
  // 1) pedidos NÃO pagos e ATRASADOS (mais dias de atraso primeiro)
  // 2) pedidos NÃO pagos e próximos do vencimento (menor daysUntilDue primeiro)
  // 3) pedidos pagos (colocados no final)
  // Em empates, usa data de criação como fallback.
  const compareByDue = (a: OrderWithClient, b: OrderWithClient) => {
    // 1) Colocar pedidos totalmente pagos no final
    const aIsFullyPaid = (a.paid || 0) === 0;
    const bIsFullyPaid = (b.paid || 0) === 0;
    if (aIsFullyPaid !== bIsFullyPaid) return aIsFullyPaid ? 1 : -1; // unpaid (false) vem antes de paid (true)

    // Agora ambos são unpaid OU ambos pagos. Se ambos pagos, mantemos ordenação por data (antiga)
    if (aIsFullyPaid && bIsFullyPaid) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }

    // Ambos não totalmente pagos -> avaliar atraso / próxima data
    const aInfo = computeDueInfo(a);
    const bInfo = computeDueInfo(b);

    // 2) Se um é atrasado e o outro não, atrasados vêm primeiro
    if (aInfo.overdue !== bInfo.overdue) {
      return aInfo.overdue ? -1 : 1;
    }

    // 3) Se ambos atrasados -> quem está MAIS atrasado vem primeiro (diasOverdue maior)
    if (aInfo.overdue && bInfo.overdue) {
      // mais atrasado -> menor índice (vem antes)
      return bInfo.daysOverdue - aInfo.daysOverdue;
    }

    // 4) Nenhum está atrasado -> ordenar por daysUntilDue crescente (mais próximo primeiro)
    if (aInfo.daysUntilDue !== bInfo.daysUntilDue) {
      return aInfo.daysUntilDue - bInfo.daysUntilDue;
    }

    // 5) fallback por data do pedido (comportamento anterior)
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  };

  // --- Fim das funções substitutas ---

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  // Criamos uma cópia e ordenamos conforme o modo (por vencimento ou por data)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortByDue) return compareByDue(a, b);
    // comportamento anterior: ordenar por data (mais recente primeiro)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const firstOverdueId = sortedOrders.find(
    (o) => computeDueInfo(o).overdue,
  )?._id;

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie todos os pedidos
          </p>
        </div>
        <Link
          to="/orders/new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 sm:mt-0"
        >
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Link>
      </div>

      {/* Statistics */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="flex items-center rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-light p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Receita Total</div>
              <div className="text-[17px] font-bold text-foreground lg:text-xl">
                {formatCurrency(totalRevenue)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-light p-2">
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

        <div className="flex items-center rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-light p-2">
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

        <div className="flex items-center rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-light p-2">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ticket Médio</div>
              <div className="text-[17px] font-bold text-foreground lg:text-xl">
                {formatCurrency(averageOrderValue)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-light p-2">
              <ClockArrowUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Receita pendente
              </div>
              <div className="text-[17px] font-bold text-foreground lg:text-xl">
                {formatCurrency(expectedRevenue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + botão de ordenação por vencimento */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, cpf..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-3 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setSortByDue((s) => !s)}
          className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2 sm:mt-0 ${
            sortByDue
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground"
          }`}
          title="Ordenar por proximidade do vencimento"
        >
          <ClockArrowUp className="h-4 w-4" />
          {sortByDue ? "Ordenando por vencimento" : "Ordenar por vencimento"}
        </button>
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mb-4 text-muted-foreground">
            {searchTerm
              ? "Nenhum pedido encontrado"
              : "Nenhum pedido registrado"}
          </div>
          {!searchTerm && (
            <Link
              to="/orders/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Criar primeiro pedido
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          {sortedOrders.map((order) => {
            const overdueClasses =
              computeDueInfo(order).overdue && sortByDue
                ? "border-destructive bg-destructive/10" // destaque para todos os atrasados (sutil)
                : "";

            const dueInfo = computeDueInfo(order);

            return (
              <Link to={`${order._id}/edit`} key={order._id}>
                <div
                  className={`${overdueClasses} group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground">
                          {order.client?.name +
                            " -- " +
                            (order.vendedora || "Indefinido") ||
                            "Cliente não encontrado"}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
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
                          {dueInfo?.candidateDate
                            ? `${new Date(dueInfo.candidateDate).getDate()}${
                                dueInfo.nextInstallmentNumber
                                  ? ` • Parc ${dueInfo.nextInstallmentNumber}`
                                  : ""
                              }`
                            : "-"}
                          <div className="mt-2">
                            {order.paid === 0 ? (
                              <div className="inline-flex items-center gap-2 text-sm text-green-600">
                                <BadgeCheck className="h-5 w-5" />
                                <span className="font-medium">Pago</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 text-sm text-destructive">
                                <CircleX className="h-5 w-5" />
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
                      <div className="mb-1 text-2xl font-bold text-primary">
                        {formatCurrency(order.price || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>
                          Valor já pago:{" "}
                          {formatCurrency(order.installmentsPaid || 0)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>
                          Parcelas restantes:{" "}
                          {order.parcelas - order.parcelasPagas}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order items preview */}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Produtos:</span>{" "}
                      {order.items.length} tipo(s) de produto
                    </div>
                    {(() => {
                      const encoded = hashids.encodeHex(order._id);

                      return (
                        <a
                          href={`/nota/${encoded}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="relative flex w-10 items-center gap-3 overflow-hidden rounded-lg bg-primary-light p-2 transition-all duration-300 hover:w-[160px]"
                        >
                          <ScrollText className="h-6 w-6 text-primary" />
                          <p className="absolute ml-10 whitespace-nowrap font-semibold text-primary">
                            Gerar Fatura
                          </p>
                        </a>
                      );
                      // <Link to={`/${encoded}`}>Hash link</Link>;
                    })()}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderList;
