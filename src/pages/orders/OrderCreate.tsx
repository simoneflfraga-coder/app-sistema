import { useToast } from "@/hooks/use-toast";
import { api, Client, OrderItem, Product } from "@/services/api";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface OrderFormItem extends OrderItem {
  product?: Product;
}

const OrderCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([]);
  const [selectedVendedora, setSelectedVendedora] = useState<string>("");

  // Agora: número de parcelas (quantidade)
  const [parcelas, setParcelas] = useState<number>(1);

  // Estado com as datas específicas de cada parcela no formato 'YYYY-MM-DD'
  const [installmentDates, setInstallmentDates] = useState<string[]>([]);

  // Valor já pago em REAIS no input (converteremos para centavos ao enviar)
  const [amountPaid, setAmountPaid] = useState<number>(0);

  const vendedoras = useMemo(
    () =>
      (import.meta.env.VITE_VENDEDORAS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [],
  );

  useEffect(() => {
    loadData();
    console.log("vendedoras: " + vendedoras);
  }, []);

  // Quando a quantidade de parcelas mudar, ajusta o array de datas (cria defaults ou corta)
  useEffect(() => {
    setInstallmentDates((prev) => {
      const targetLen = Math.max(1, parcelas || 1);
      if (prev.length === targetLen) return prev;
      const res = prev.slice(0, targetLen);
      if (res.length < targetLen) {
        // adicionar datas default incrementando meses a partir de hoje
        const needed = targetLen - res.length;
        const lastDate = res.length
          ? new Date(res[res.length - 1])
          : new Date();
        for (let i = 0; i < needed; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() + res.length + i);
          res.push(formatDateInput(d));
        }
      }
      return res;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelas]);

  const loadData = async () => {
    try {
      const [clientsRes, productsRes] = await Promise.all([
        api.getClients(),
        api.getProducts(),
      ]);

      if (clientsRes.error) throw new Error(clientsRes.error);
      if (productsRes.error) throw new Error(productsRes.error);

      setClients(clientsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const addProduct = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;

    const existingItem = orderItems.find(
      (item) => item.productId === productId,
    );

    if (existingItem) {
      setOrderItems((items) =>
        items.map((item) =>
          item.productId === productId
            ? { ...item, amount: Math.min(item.amount + 1, product.stock) }
            : item,
        ),
      );
    } else {
      setOrderItems((items) => [
        ...items,
        {
          productId,
          amount: 1,
          // product.price vem em CENTAVOS do backend.
          // Aqui guardamos unitPrice em REAIS para facilitar a edição no input.
          unitPrice: product.price / 100,
          product,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;

    const validQty = Math.max(1, Math.min(newQty, product.stock));

    setOrderItems((items) =>
      items.map((item) =>
        item.productId === productId ? { ...item, amount: validQty } : item,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setOrderItems((items) =>
      items.filter((item) => item.productId !== productId),
    );
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setOrderItems((items) =>
      items.map((item) =>
        item.productId === productId
          ? { ...item, unitPrice: Math.max(0.0, newPrice) } // unitPrice em REAIS
          : item,
      ),
    );
  };

  const totalQty = orderItems.reduce((sum, item) => sum + item.amount, 0);
  const totalPrice = orderItems.reduce(
    (sum, item) => sum + item.amount * item.unitPrice, // unitPrice em REAIS -> totalPrice em REAIS
    0,
  );

  // centavos calculados localmente
  const totalPriceCents = Math.round(totalPrice * 100);
  const installmentsPaidCents = Math.round(amountPaid * 100);
  const remainingCents = Math.max(0, totalPriceCents - installmentsPaidCents);

  // Helper: formata date para input type="date" (YYYY-MM-DD)
  function formatDateInput(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Atualiza a data da parcela indexada
  function updateInstallmentDate(index: number, value: string) {
    setInstallmentDates((prev) => {
      const copy = prev.slice();
      copy[index] = value;
      return copy;
    });
  }

  // Monta o array de installments detalhados usando datas específicas (installmentDates)
  function buildInstallments(
    instalCount: number,
    dates: string[] | undefined,
    totalCents: number,
    paidCents: number,
  ) {
    const installmentsArr: {
      number: number;
      dueDate: string;
      amount: number;
      status: "pendente" | "pago" | "atrasado";
    }[] = [];

    if (!instalCount || instalCount < 1) return installmentsArr;

    // divisão base das centavos entre parcelas
    const base = Math.floor(totalCents / instalCount);
    const remainder = totalCents - base * instalCount; // distribuir 1 cent a mais para as primeiras 'remainder' parcelas

    // valor remanescente para marcar parcelas como pagas
    let paidLeft = Math.max(0, paidCents);

    for (let i = 0; i < instalCount; i++) {
      // calcular valor da parcela (distribui o remainder nos primeiros itens)
      const extra = i < remainder ? 1 : 0;
      const amount = base + extra;

      // usar data fornecida se existir; senão fallback para hoje + i meses
      let dueDateIso: string;
      const dateStr = dates && dates[i];
      if (dateStr) {
        // normaliza string 'YYYY-MM-DD' para ISO
        const dt = new Date(dateStr + "T00:00:00");
        if (isNaN(dt.getTime())) {
          // fallback se data inválida
          const f = new Date();
          f.setMonth(f.getMonth() + i);
          dueDateIso = formatDateInput(f) + "T00:00:00.000Z";
        } else {
          dueDateIso = new Date(
            dt.getFullYear(),
            dt.getMonth(),
            dt.getDate(),
          ).toISOString();
        }
      } else {
        const f = new Date();
        f.setMonth(f.getMonth() + i);
        dueDateIso = new Date(
          f.getFullYear(),
          f.getMonth(),
          f.getDate(),
        ).toISOString();
      }

      // marcar 'pago' se já houver saldo pago cobrindo essa parcela
      const status: "pendente" | "pago" | "atrasado" =
        paidLeft >= amount ? "pago" : "pendente";
      if (paidLeft >= amount) paidLeft -= amount;

      installmentsArr.push({
        number: i + 1,
        dueDate: dueDateIso,
        amount,
        status,
      });
    }

    return installmentsArr;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente para o pedido.",
        variant: "destructive",
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "Produtos obrigatórios",
        description: "Adicione pelo menos um produto ao pedido.",
        variant: "destructive",
      });
      return;
    }

    // valida datas das parcelas: se alguma for vazia -> erro
    if (
      !installmentDates ||
      installmentDates.length !== parcelas ||
      installmentDates.some((d) => !d)
    ) {
      toast({
        title: "Datas das parcelas inválidas",
        description: "Preencha uma data válida para cada parcela.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // montar installments detalhados usando as datas específicas
      const installmentsArray = buildInstallments(
        parcelas,
        installmentDates,
        totalPriceCents,
        installmentsPaidCents,
      );

      // calcular quantas parcelas ficaram marcadas como pagas
      const parcelasPagasComputed = installmentsArray.filter(
        (it) => it.status === "pago",
      ).length;

      const orderData = {
        customerId: selectedCustomerId,
        items: orderItems.map((item) => ({
          productId: item.productId,
          amount: item.amount,
          // converter unitPrice (REAIS) -> CENTAVOS para a API
          unitPrice: Math.round(item.unitPrice * 100),
        })),
        // manter seu comportamento atual (totalAmount = total de itens)
        totalAmount: totalQty,
        // enviar totalPrice em CENTAVOS
        price: totalPriceCents,
        // agora: dia do mês que vence
        installmentsTotal: parcelas,
        // agora: valor já pago em CENTAVOS
        installmentsPaid: installmentsPaidCents,
        paid: Math.max(0, totalPriceCents - installmentsPaidCents),
        parcelas: parcelas,
        parcelasPagas: parcelasPagasComputed,

        // O array detalhado que o model exige (datas específicas)
        installments: installmentsArray,

        // inicializa histórico de pagamentos vazio (backend recalcula instalmentsPaid/paid a partir deste campo)
        paymentHistory: [],

        vendedora: selectedVendedora,

        // não enviamos `paid` — backend recalcula
      };

      const response = await api.createOrder(orderData);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Pedido criado com sucesso!",
        description: `Pedido de ${formatCurrency(totalPrice)} foi registrado.`,
      });

      navigate("/orders");
    } catch (error) {
      toast({
        title: "Erro ao criar pedido",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // formatCurrency espera VALOR EM REAIS (já dividido)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const availableProducts = products.filter(
    (p) => p.stock > 0 && !orderItems.some((item) => item.productId === p._id),
  );

  // preview das parcelas (apenas para visualização no frontend)
  const installmentsPreview = buildInstallments(
    parcelas,
    installmentDates,
    totalPriceCents,
    installmentsPaidCents,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Novo Pedido</h1>
        <p className="mt-2 text-muted-foreground">
          Crie um novo pedido para um cliente
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Cliente Selection */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">Cliente</h2>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-input px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecione um cliente</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name} - {client.telephone}
              </option>
            ))}
          </select>
        </div>

        {/* Product Selection */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Adicionar Produtos
          </h2>

          {availableProducts.length > 0 ? (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableProducts.map((product) => (
                <div
                  key={product._id}
                  className="rounded-lg border border-border p-4"
                >
                  <h3 className="mb-2 font-medium text-foreground">
                    {product.name}
                  </h3>
                  <div className="mb-2 text-sm text-muted-foreground">
                    <div>Código: {product.code}</div>
                    <div>Estoque: {product.stock}</div>
                    <div className="font-medium text-primary">
                      {formatCurrency(product.price / 100)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(product._id)}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Plus className="mr-2 inline h-4 w-4" />
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {orderItems.length > 0
                ? "Todos os produtos disponíveis foram adicionados"
                : "Nenhum produto disponível no estoque"}
            </div>
          )}
        </div>

        {/* Order Items */}
        {orderItems.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Itens do Pedido
            </h2>

            <div className="space-y-4">
              {orderItems.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {item.product?.name}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Código: {item.product?.code} | Estoque:{" "}
                        {item.product?.stock}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.amount - 1)
                        }
                        className="rounded-lg border border-border p-2 hover:bg-accent"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-16 rounded-lg bg-input px-4 py-2 text-center">
                        {item.amount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.amount + 1)
                        }
                        className="rounded-lg border border-border p-2 hover:bg-accent"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">R$</span>
                      {/* unitPrice está em REAIS para edição */}
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updatePrice(
                            item.productId,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        min="0.00"
                        step="0.01"
                        className="w-24 rounded-lg border border-border bg-input px-3 py-2 text-center"
                      />
                    </div>

                    <div className="text-right">
                      <div className="font-medium text-primary">
                        {formatCurrency(item.amount * item.unitPrice)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Vendedora:
          </h2>

          <div className="space-y-4">
            {vendedoras.map((nome, i) => (
              <div key={nome + i} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`vendedora-${i}`}
                  name="vendedora"
                  value={nome}
                  checked={selectedVendedora === nome}
                  onChange={() => {
                    setSelectedVendedora(nome);
                    console.log(selectedVendedora);
                  }}
                  className="accent-primary"
                />
                <label
                  htmlFor={`vendedora-${i}`}
                  className="text-sm text-foreground"
                >
                  {nome}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {orderItems.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Resumo do Pedido
            </h2>

            <div className="space-y-4">
              {/* Quantidade de parcelas */}
              <div className="flex items-center gap-4">
                <label
                  htmlFor="parcelas"
                  className="text-sm font-medium text-foreground"
                >
                  Quantidade de parcelas:
                </label>
                <select
                  id="parcelas"
                  value={parcelas}
                  onChange={(e) => setParcelas(parseInt(e.target.value))}
                  className="rounded-lg border border-border bg-input px-3 py-2"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <span className="ml-3 hidden text-sm text-muted-foreground sm:block">
                  Quantidade de parcelas do pedido
                </span>
              </div>

              {/* Datas específicas por parcela */}
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground">
                  Datas de vencimento por parcela
                </label>
                <p className="text-xs text-muted-foreground">
                  Preencha a data específica de vencimento para cada parcela.
                </p>

                <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {Array.from({ length: parcelas }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <input
                        type="date"
                        value={installmentDates[idx] ?? ""}
                        onChange={(e) =>
                          updateInstallmentDate(idx, e.target.value)
                        }
                        className="rounded-lg border border-border bg-input px-3 py-2"
                      />
                    </div>
                  ))}
                </div>

                {/* preview das parcelas (datas & valor por parcela) */}
                <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
                  <div className="mb-2 font-medium">Preview das parcelas</div>
                  {installmentsPreview.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Nenhuma parcela calculada
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {installmentsPreview.map((it) => (
                        <div key={it.number} className="flex justify-between">
                          <div>
                            #{it.number} —{" "}
                            {new Date(it.dueDate).toLocaleDateString()}
                            {it.status === "pago" ? " • Pago" : ""}
                          </div>
                          <div>{formatCurrency(it.amount / 100)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de itens:</span>
                  <span className="font-medium">{totalQty}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium text-foreground">Total:</span>
                  <span className="text-bold text-primary">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Valor da parcela (média):
                  </span>
                  <span className="font-medium">
                    {formatCurrency(totalPrice / parcelas)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor já pago:</span>
                  <span className="font-medium">
                    {formatCurrency(installmentsPaidCents / 100)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Valor em aberto:
                  </span>
                  <span className="font-medium text-destructive">
                    {formatCurrency(remainingCents / 100)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="submit"
            disabled={loading || orderItems.length === 0 || !selectedCustomerId}
            className="flex-1 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Criando pedido..." : "Criar Pedido"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="flex-1 rounded-lg bg-secondary px-6 py-3 font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderCreate;
