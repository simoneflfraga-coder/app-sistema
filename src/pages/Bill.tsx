import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api, Order, Product, PublicClient } from "@/services/api";
import Hashids from "hashids";
import { ArrowLeft, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import logo from "@/assets/logoS.jpeg";

import { BadgeCheck, Phone } from "lucide-react";

const hashids = new Hashids("sistema", 6);

interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status?: string; // status is required
  _id?: string;
}

const Bill = () => {
  let { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [client, setClient] = useState<PublicClient | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [nextInstallment, setNextInstallment] = useState<Installment | null>(
    null,
  );

  id = hashids.decodeHex(id);

  useEffect(() => {
    if (id) {
      loadInvoiceData();
    }
  }, [id]);

  const loadInvoiceData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Carregar pedido
      const orderResponse = await api.getPublicOrder(id);
      console.log(orderResponse);
      if (orderResponse.error || !orderResponse.data) {
        toast({
          title: "Erro",
          description: "Erro ao carregar pedido",
          variant: "destructive",
        });
        return;
      }

      const orderData = orderResponse.data;
      setOrder(orderData);

      // Carregar cliente
      const clientResponse = await api.getPublicClient(orderData.customerId);
      if (clientResponse.data) {
        setClient(clientResponse.data);
      }

      // Carregar produtos
      const productsResponse = await api.getPublicProducts();
      if (productsResponse.data) {
        setProducts(productsResponse.data);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da fatura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!order?.installments?.length) {
      setNextInstallment(null);
      return;
    }

    // considera como "paga" qualquer status que contenha 'pago'/'paga' (case-insensitive)
    const pendentes = order.installments.filter((inst) => {
      const s = (inst.status || "").toString().toLowerCase();
      return !(s.includes("pago") || s.includes("paga") || s === "paid"); // mantém flexibilidade
    });

    if (pendentes.length === 0) {
      setNextInstallment(null);
      return;
    }

    // ordenar por dueDate ascendente e pegar o primeiro (mais antigo = próximo a ser pago / mais atrasado)
    const sorted = [...pendentes].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    setNextInstallment(sorted[0]);
  }, [order]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getProductName = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    return product?.name || "Produto não encontrado";
  };

  const calculateTotalPaid = () => {
    if (!order?.paymentHistory) return 0;
    return order.paymentHistory.reduce(
      (sum, payment) => sum + payment.value,
      0,
    );
  };

  const calculateAmountDue = () => {
    if (!order) return 0;
    return order.price - calculateTotalPaid();
  };

  const getLastPaymentDate = () => {
    if (!order?.paymentHistory || order.paymentHistory.length === 0)
      return null;
    const sortedPayments = [...order.paymentHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return sortedPayments[0].date;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <div className="text-lg font-medium text-primary">
            Carregando fatura...
          </div>
        </div>
      </div>
    );
  }

  if (!order || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
        <div className="text-center">
          <div className="mb-4 text-xl text-destructive">
            ⚠️ Fatura não encontrada
          </div>
          <Link to="/orders">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar aos Pedidos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="flex h-20 items-center justify-center px-4">
        <Button
          variant="outline"
          size="sm"
          className="flex flex-1 items-center justify-center gap-2 sm:flex-none"
          onClick={() => {
            navigator.share?.({
              title: `Fatura #${order._id.slice(-6)}`,
              url: window.location.href,
            }) || navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link copiado!" });
          }}
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Compartilhar</span>
        </Button>
      </header>
      {/* Invoice Content */}
      <div className="mx-auto max-w-4xl p-4">
        <div className="overflow-hidden rounded-xl bg-white shadow-xl print:rounded-none print:shadow-none">
          {/* Mobile-first responsive padding */}
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header with Logo and Company Info */}
            <div className="mb-6 flex flex-col items-start justify-between border-b border-border pb-6 sm:mb-8 lg:flex-row">
              <div className="mb-4 flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center lg:mb-0 lg:w-auto">
                <div className="flex h-36 w-36 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 sm:h-36 sm:w-36 lg:h-36 lg:w-36">
                  <img src={logo} className="h-full w-full" alt="" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-bold text-[#946545] sm:hidden sm:text-base">
                    {/* Magda Lima Perfumaria e Acessórios */}
                    {import.meta.env.VITE_STORE_NAME}
                  </p>
                </div>
              </div>
              <div className="mt-4 w-full lg:mt-0 lg:w-auto">
                <div className="rounded-lg bg-muted/30 p-3 sm:p-4">
                  <div className="space-y-1 text-xs text-muted-foreground sm:text-sm">
                    <div className="flex justify-between lg:block">
                      <span className="font-medium">Chave Pix:</span>
                      <span className="lg:block">
                        {import.meta.env.VITE_STORE_PIX}
                      </span>
                    </div>
                    <div className="flex justify-between lg:block">
                      <span className="font-medium">Telefone:</span>
                      <span className="lg:block">
                        {import.meta.env.VITE_STORE_NUMBER}
                      </span>
                    </div>
                    <div className="flex justify-between lg:block">
                      <span className="font-medium">Email:</span>
                      <span className="text-xs lg:block">
                        {import.meta.env.VITE_STORE_EMAIL}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To and Invoice Info */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="rounded-lg bg-muted/20 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary sm:text-base">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  CLIENTE
                </h3>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground sm:text-base">
                    {client.name}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {client.telephone
                      ? client.telephone.replace(/\d(?=\d{4})/g, "*")
                      : ""}
                  </p>
                  {/* {client.address && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {client.address}
                    </p>
                  )} */}
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary sm:text-base">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  DETALHES DA FATURA
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Data da compra
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(order.date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Último Pagamento
                    </span>
                    <span className="text-sm font-medium">
                      {getLastPaymentDate()
                        ? formatDate(getLastPaymentDate()!)
                        : "Nenhum"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Próxima parcela
                    </span>
                    <span
                      className={`text-sm font-medium ${nextInstallment && new Date(nextInstallment.dueDate).getTime() < Date.now() ? "text-destructive" : ""}`}
                    >
                      {nextInstallment
                        ? `${formatDate(nextInstallment.dueDate)}`
                        : "Nenhuma pendente"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6 sm:mb-8">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-primary sm:text-lg">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                ITENS DO PEDIDO
              </h3>

              {/* Mobile Cards View */}
              <div className="space-y-3 sm:hidden">
                {order.items.map((item, index) => {
                  const itemTotal = item.amount * item.unitPrice;
                  return (
                    <div
                      key={index}
                      className="rounded-lg border bg-muted/30 p-4"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="text-sm font-medium">
                          {getProductName(item.productId)}
                        </h4>
                        <span className="font-bold text-primary">
                          {formatCurrency(itemTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Qtd: {item.amount}</span>
                        <span>Preço: {formatCurrency(item.unitPrice)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-primary/20 bg-muted/20">
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Item
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Preço Unitário
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => {
                      const itemTotal = item.amount * item.unitPrice;
                      return (
                        <tr
                          key={index}
                          className="border-b border-muted/50 transition-colors hover:bg-muted/10"
                        >
                          <td className="px-4 py-4 font-medium">
                            {getProductName(item.productId)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
                              {item.amount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-muted-foreground">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-primary">
                            {formatCurrency(itemTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="mb-6" />

            {/* Totals */}
            <div className="mb-6 rounded-lg bg-primary/5 p-4 sm:mb-8 sm:p-6">
              <div className="flex justify-center">
                <div className="w-full max-w-md space-y-3">
                  <div className="flex items-center justify-between py-2 text-sm sm:text-base">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(order.price)}
                    </span>
                  </div>
                  <div className="border-t border-border"></div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-lg font-bold sm:text-xl">TOTAL</span>
                    <span className="text-xl font-bold text-primary sm:text-2xl">
                      {formatCurrency(order.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {order.paymentHistory && order.paymentHistory.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-primary sm:text-lg">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  HISTÓRICO DE PAGAMENTOS
                </h3>

                {/* Mobile Cards View */}
                <div className="space-y-3 sm:hidden">
                  {order.paymentHistory.map((payment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border-2 border-blue-600 bg-blue-500/5 p-4"
                    >
                      <BadgeCheck className="h-8 w-8 text-blue-500" />

                      <div className="flex flex-col items-end">
                        <p className="font-bold text-blue-700">
                          {formatCurrency(payment.value)}
                        </p>
                        <p className="text-[11px] opacity-50">
                          {formatDate(payment.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden overflow-hidden rounded-lg bg-blue-500/5 sm:block">
                  <table className="w-full">
                    <thead className="bg-blue-600/10">
                      <tr className="text-blue-800">
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Data do Pagamento
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Valor Pago
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.paymentHistory.map((payment, index) => (
                        <tr key={index} className="border-t border-blue-800/20">
                          <td className="flex items-center gap-2 px-4 py-3 font-medium text-blue-600">
                            {/* <span className="text-success">✓</span> */}
                            <BadgeCheck className="h-6 w-6 text-blue-600" />
                            {formatDate(payment.date)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">
                            {formatCurrency(payment.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <hr className="mb-6" />

            {/* Amount Due */}
            {calculateAmountDue() > 0 && (
              <div className="mb-6 rounded-xl border-blue-500 bg-blue-200 p-4 text-center sm:mb-8 sm:p-6">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <p className="text-sm font-medium text-blue-800 sm:text-base">
                    VALOR EM ABERTO
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-700 sm:text-3xl lg:text-4xl">
                  {formatCurrency(calculateAmountDue())}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-600 sm:text-sm">
              Utilize a chave Pix{" "}
              <strong>{import.meta.env.VITE_STORE_PIX}</strong> para pagamento
            </p>

            <div className="my-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    import.meta.env.VITE_STORE_PIX || "",
                  );
                  toast({ title: "Chave Pix copiada!" });
                }}
              >
                Copiar chave Pix
              </Button>
            </div>

            {/* Payment Info Footer */}
            <div className="rounded-lg bg-muted/30 p-4 text-center sm:p-6">
              <div className="mt-4 border-t border-border/50 pt-4">
                <p className="text-xs text-muted-foreground">
                  Precisa de um sistema como esse para o gerencimento de sua
                  loja? Mande Mensagem: (15) 98168-0024
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bill;
