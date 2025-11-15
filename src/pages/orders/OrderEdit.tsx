import { useToast } from "@/hooks/use-toast";
import { api, Client, OrderItem, Product } from "@/services/api";
import {
  ArrowLeft,
  Minus,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type PaymentEntry = { _id?: string; date: string; value: number }; // value em REAIS no UI

type InstallmentUI = {
  number: number;
  dueDate: string; // "YYYY-MM-DD" para input
  amount: number; // em REAIS no UI
  status: "pendente" | "pago" | "atrasado";
};

const OrderEdit = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(
    null,
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [nameCustomer, setNameCustomer] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [newPaymentValue, setNewPaymentValue] = useState<number | "">("");
  const [newPaymentDate, setNewPaymentDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }); // yyyy-mm-dd optional

  const [formData, setFormData] = useState({
    customerId: "",
    items: [] as OrderItem[], // unitPrice em REAIS no UI
    installmentsTotal: 1, // dia do mês (1..31) - compatibilidade
    installmentsPaid: 0, // REAIS no UI
    paymentHistory: [] as PaymentEntry[], // REAIS no UI
  });

  // novo estado: installments detalhados para editar (UI)
  const [installments, setInstallments] = useState<InstallmentUI[]>([]);

  useEffect(() => {
    loadInitialData();
    if (id) {
      loadOrder(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInitialData = async () => {
    try {
      const [clientsResponse, productsResponse] = await Promise.all([
        api.getClients(),
        api.getProducts(),
      ]);

      if (clientsResponse.data) setClients(clientsResponse.data);
      if (productsResponse.data) setProducts(productsResponse.data);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Erro ao carregar clientes e produtos",
        variant: "destructive",
      });
    }
  };

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await api.getOrder(orderId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        // converter unitPrice (CENTAVOS -> REAIS) ao preencher o form
        const itemsInReais = (response.data.items || []).map(
          (it: OrderItem) => ({
            ...it,
            unitPrice: (it.unitPrice ?? 0) / 100, // unitPrice em REAIS para UI
          }),
        );

        // paymentHistory: converter CENTAVOS -> REAIS para UI e manter _id
        const paymentHistoryInReais = (response.data.paymentHistory || []).map(
          (ph: any) => ({
            _id: ph._id,
            date: ph.date,
            value: (ph.value || 0) / 100,
          }),
        );

        // installments: converter do servidor (centavos + ISO) para UI (REAIS + YYYY-MM-DD)
        let installmentsUI: InstallmentUI[] = [];
        if (
          Array.isArray(response.data.installments) &&
          response.data.installments.length > 0
        ) {
          installmentsUI = response.data.installments.map(
            (inst: any, idx: number) => {
              // guardas seguros
              const number = inst.number ?? idx + 1;
              const amountCents = Number(inst.amount ?? 0);
              const amountReais = Math.round(amountCents) / 100;
              let dueDateYmd = toYMD(new Date());
              if (inst.dueDate) {
                const dt = new Date(inst.dueDate);
                if (!isNaN(dt.getTime())) {
                  dueDateYmd = toYMD(dt);
                }
              }
              const status =
                inst.status === "pago" || inst.status === "atrasado"
                  ? inst.status
                  : "pendente";

              return {
                number: Number(number),
                dueDate: dueDateYmd,
                amount: amountReais,
                status,
              } as InstallmentUI;
            },
          );
        } else {
          // fallback: criar uma parcela única com dueDate hoje
          installmentsUI = [
            {
              number: 1,
              dueDate: toYMD(new Date()),
              amount: (response.data.price || 0) / 100,
              status: "pendente",
            },
          ];
        }

        setFormData({
          customerId: response.data.customerId,
          items: itemsInReais,
          installmentsTotal: response.data.installmentsTotal || 1,
          // installmentsPaid no backend está em CENTAVOS -> converter pra REAIS pro input
          installmentsPaid: (response.data.installmentsPaid || 0) / 100,
          paymentHistory: paymentHistoryInReais,
        });

        setInstallments(installmentsUI);
      }

      const responseOne = await api.getClient(response.data.customerId);
      if (responseOne.data) setNameCustomer(responseOne.data.name);
    } catch (error) {
      toast({
        title: "Erro ao carregar pedido",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const addProduct = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", amount: 1, unitPrice: 0 }],
    }));
  };

  const removeProduct = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (
    index: number,
    field: keyof OrderItem,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value } as OrderItem;

          if (field === "productId") {
            const product = products.find((p) => p._id === value);
            if (product) {
              // product.price vem em CENTAVOS -> converter para REAIS para UI
              updatedItem.unitPrice = product.price / 100;
            }
          }

          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const calculateTotals = () => {
    const totalAmount = formData.items.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    // item.unitPrice está em REAIS na UI → price em REAIS
    const price = formData.items.reduce(
      (sum, item) => sum + item.amount * item.unitPrice,
      0,
    );
    return { totalAmount, price };
  };

  // --- NOVAS FUNÇÕES PARA INSTALLMENTS (UI) ---

  function updateInstallmentField(
    index: number,
    field: keyof InstallmentUI,
    value: any,
  ) {
    setInstallments((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  }

  function addInstallment() {
    setInstallments((prev) => {
      const nextNum = prev.length + 1;
      // default: next month same day as last or today
      const lastDate = prev.length
        ? new Date(prev[prev.length - 1].dueDate)
        : new Date();
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + 1);
      const dueDefault = toYMD(d);
      return [
        ...prev,
        {
          number: nextNum,
          dueDate: dueDefault,
          amount: prev.length ? prev[prev.length - 1].amount : 0,
          status: "pendente",
        },
      ];
    });
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => {
      const next = prev
        .filter((_, i) => i !== index)
        .map((it, i) => ({ ...it, number: i + 1 }));
      return next;
    });
  }

  // --- FIM installments helpers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast({
        title: "Selecione um cliente",
        variant: "destructive",
      });
      return;
    }

    if (formData.items.length === 0) {
      toast({
        title: "Adicione pelo menos um produto",
        variant: "destructive",
      });
      return;
    }

    if (formData.items.some((item) => !item.productId || item.amount <= 0)) {
      toast({
        title: "Todos os produtos devem ter quantidade maior que zero",
        variant: "destructive",
      });
      return;
    }

    if (!id) return;

    // valida day 1..31 (mantive sua validação original)
    if (formData.installmentsTotal < 1 || formData.installmentsTotal > 31) {
      toast({
        title: "Dia de vencimento inválido",
        description: "Escolha um dia entre 1 e 31 para o vencimento.",
        variant: "destructive",
      });
      return;
    }

    // valida installments UI: cada parcela precisa ter data válida e amount >= 0
    if (!installments || installments.length === 0) {
      toast({
        title: "Parcelas inválidas",
        description: "Insira ao menos uma parcela.",
        variant: "destructive",
      });
      return;
    }
    if (
      installments.some(
        (it) => !it.dueDate || isNaN(new Date(it.dueDate).getTime()),
      )
    ) {
      toast({
        title: "Datas inválidas",
        description: "Preencha datas válidas para todas as parcelas.",
        variant: "destructive",
      });
      return;
    }
    if (
      installments.some(
        (it) =>
          typeof it.amount !== "number" || isNaN(it.amount) || it.amount < 0,
      )
    ) {
      toast({
        title: "Valores inválidos",
        description: "Preencha valores válidos (R$) para todas as parcelas.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { totalAmount, price } = calculateTotals();

      // converter cada unitPrice (REAIS) -> CENTAVOS antes de enviar
      const itemsInCentavos = formData.items.map((it) => ({
        ...it,
        unitPrice: Math.round((it.unitPrice ?? 0) * 100),
      }));

      const priceCents = Math.round(price * 100);
      const installmentsPaidCents = Math.round(
        (formData.installmentsPaid || 0) * 100,
      );
      const remainingCents = Math.max(0, priceCents - installmentsPaidCents);

      // converter paymentHistory (REAIS -> CENTAVOS)
      const paymentHistoryInCentavos = (formData.paymentHistory || []).map(
        (ph) => ({
          date: ph.date || new Date().toISOString(),
          value: Math.round((ph.value || 0) * 100),
        }),
      );

      // converter installments do UI (REAIS + YYYY-MM-DD) -> servidor (centavos + ISO)
      const installmentsForServer = installments.map((it) => {
        // usa meio-dia UTC para reduzir problemas de fuso
        const dueIso = new Date(`${it.dueDate}T12:00:00Z`).toISOString();
        return {
          number: Number(it.number),
          dueDate: dueIso,
          amount: Math.round((it.amount || 0) * 100),
          status: it.status,
        };
      });

      // parcelas e parcelasPagas
      const parcelasCount = installmentsForServer.length;
      const parcelasPagasCount = installmentsForServer.filter(
        (it) => it.status === "pago",
      ).length;

      const orderData = {
        customerId: formData.customerId,
        items: itemsInCentavos,
        totalAmount, // CORREÇÃO: nome correto
        // price em CENTAVOS
        price: priceCents,
        // dia do vencimento (campo mantido por compatibilidade)
        installmentsTotal: formData.installmentsTotal,
        // valor já pago em CENTAVOS (envia, mas o backend pode recalcular)
        installmentsPaid: installmentsPaidCents,
        // quanto falta pagar (CENTAVOS) — backend também recalcula, but we send to satisfy types
        paid: remainingCents,
        // incluir histórico (centavos)
        paymentHistory: paymentHistoryInCentavos,
        // incluir installments detalhados (obrigatório no seu schema)
        installments: installmentsForServer,
        // compatibilidade com os campos antigos
        parcelas: parcelasCount,
        parcelasPagas: parcelasPagasCount,
      };

      const response = await api.updateOrder(id, orderData);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Pedido atualizado com sucesso!",
      });

      navigate("/orders");
    } catch (error) {
      toast({
        title: "Erro ao atualizar pedido",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!id) return;
    const valueNumber =
      typeof newPaymentValue === "string" && newPaymentValue !== ""
        ? parseFloat(newPaymentValue)
        : (newPaymentValue as number);
    if (!valueNumber || valueNumber <= 0) {
      toast({ title: "Informe um valor válido (> 0)", variant: "destructive" });
      return;
    }

    setAddingPayment(true);

    // monta o objeto de pagamento para enviar (value em CENTAVOS)
    const cents = Math.round(valueNumber * 100);
    // usar meio-dia UTC para preservar a data escolhida entre fusos
    const dateIso = newPaymentDate
      ? new Date(`${newPaymentDate}T12:00:00Z`).toISOString()
      : new Date().toISOString();
    const paymentToSend = { date: dateIso, value: cents };

    try {
      if (typeof api.addPayment === "function") {
        const res = await api.addPayment(id, paymentToSend, nameCustomer);
        if (res.error) throw new Error(res.error);
        // recarrega o pedido atual do servidor (vai recalcular installmentsPaid/padi)
        await loadOrder(id);
      } else {
        const serverResp = await api.getOrder(id);
        if (serverResp.error) throw new Error(serverResp.error);
        const serverOrder = serverResp.data;

        const updatedPaymentHistory = [
          ...(serverOrder.paymentHistory || []),
          paymentToSend,
        ];

        const orderData = {
          customerId: serverOrder.customerId,
          items: serverOrder.items,
          totalAmount: serverOrder.totalAmount,
          price: serverOrder.price,
          installmentsTotal: serverOrder.installmentsTotal,
          paymentHistory: updatedPaymentHistory,
        };

        const updateResp = await api.updateOrder(id, orderData);
        if (updateResp.error) throw new Error(updateResp.error);

        await loadOrder(id);
      }

      toast({ title: "Pagamento adicionado com sucesso!" });
      // reset inputs
      setNewPaymentValue("");
      setNewPaymentDate("");
    } catch (err) {
      toast({
        title: "Erro ao adicionar pagamento",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId?: string) => {
    if (!id || !paymentId) return;
    const confirmed = window.confirm(
      "Remover esse pagamento do histórico? Essa ação não pode ser desfeita.",
    );
    if (!confirmed) return;

    try {
      setDeletingPaymentId(paymentId);
      const res = await api.deletePayment(id, paymentId);
      if (res.error) throw new Error(res.error);

      // recarrega o pedido para garantir consistência
      await loadOrder(id);
      toast({ title: "Pagamento removido com sucesso!" });
    } catch (err) {
      toast({
        title: "Erro ao remover pagamento",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const { totalAmount, price } = calculateTotals();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  // helper para formatar valores (REAIS)
  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const deleteOrder = async (id: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja remover este pedido?",
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await api.deleteOrder(id);
      if (response.error) {
        throw new Error(response.error);
      }
      toast({
        title: "Pedido removido",
        description: "O pedido foi removido com sucesso.",
        variant: "default",
      });
      navigate("/orders");
    } catch (error) {
      toast({
        title: "Erro ao remover pedido",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="relative mb-8 flex items-center justify-center gap-4">
        <button
          onClick={() => navigate("/orders")}
          className="absolute left-0 hidden items-center gap-2 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div>
          <h1 className="text-center text-3xl font-bold text-foreground">
            Editar Pedido
          </h1>
          <p className="mt-2 text-muted-foreground">
            Atualize as informações do pedido
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente Selection */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Informações do Pedido
                </h2>
                <p className="text-sm text-muted-foreground">
                  Selecione o cliente e configure o pedido
                </p>
              </div>
              <Trash2
                onClick={() => {
                  if (id) deleteOrder(id);
                }}
                className="ml-auto h-5 w-5 cursor-pointer text-red-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="customerId"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Cliente *
                </label>
                <select
                  id="customerId"
                  value={formData.customerId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customerId: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Produtos
              </h3>
              <button
                type="button"
                onClick={addProduct}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-5">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Produto
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          updateItem(index, "productId", e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
                        required
                      >
                        <option value="">Selecione um produto</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} - {formatBRL(product.price / 100)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="z-10 flex-none items-center gap-2">
                      <label className="mb-2 block w-full text-sm font-medium text-foreground">
                        Quantidade
                      </label>
                      <div className="flex items-center justify-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(
                              index,
                              "amount",
                              Math.max(1, item.amount - 1),
                            )
                          }
                          className="p-2 transition-colors hover:bg-accent"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[60px] px-4 py-2 text-center">
                          {item.amount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(index, "amount", item.amount + 1)
                          }
                          className="p-2 transition-colors hover:bg-accent"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="w-25">
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Preço unitário (R$)
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        step="0.01"
                        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-end text-sm font-medium text-foreground">
                        Subtotal: {formatBRL(item.amount * item.unitPrice)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="inline-flex items-center gap-1 text-destructive transition-colors hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {formData.items.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum produto adicionado. Clique em "Adicionar Produto" para
                  começar.
                </div>
              )}
            </div>
          </div>

          {/* Parcelamento (editável por parcela) */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Parcelamento
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addInstallment}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1 text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Parcela
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Lista de parcelas editáveis */}
              <div className="space-y-2">
                {installments.map((inst, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="w-8 text-sm text-muted-foreground">
                      #{inst.number}
                    </div>

                    <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Data
                        </label>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) =>
                            updateInstallmentField(
                              idx,
                              "dueDate",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-border bg-input px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">
                          Valor (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={String(inst.amount)}
                          onChange={(e) =>
                            updateInstallmentField(
                              idx,
                              "amount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full rounded-lg border border-border bg-input px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">
                          Status
                        </label>
                        <select
                          value={inst.status}
                          onChange={(e) =>
                            updateInstallmentField(
                              idx,
                              "status",
                              e.target.value as InstallmentUI["status"],
                            )
                          }
                          className="w-full rounded-lg border border-border bg-input px-3 py-2"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
                          <option value="atrasado">Atrasado</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => removeInstallment(idx)}
                        className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Histórico de pagamentos */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Histórico de pagamentos
                </label>
                <div className="space-y-2">
                  {formData.paymentHistory &&
                  formData.paymentHistory.length > 0 ? (
                    formData.paymentHistory
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )
                      .map((ph, idx) => (
                        <div
                          key={ph._id || idx}
                          className="group relative flex items-center justify-between rounded-lg border border-border bg-input px-4 py-2"
                        >
                          <div className="text-sm text-foreground">
                            {new Date(ph.date).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="font-medium transition-transform group-hover:-translate-x-7">
                            {formatBRL(ph.value)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePayment(ph._id)}
                            title="Remover pagamento"
                            disabled={deletingPaymentId === ph._id}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transform opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2
                              className={`h-4 w-4 ${deletingPaymentId === ph._id ? "text-muted-foreground" : "text-destructive"}`}
                            />
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nenhum pagamento registrado.
                    </div>
                  )}
                </div>
              </div>

              {/* Add payment UI */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Adicionar pagamento
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <input
                      type="number"
                      value={newPaymentValue}
                      onChange={(e) =>
                        setNewPaymentValue(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value),
                        )
                      }
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-28 bg-transparent outline-none"
                    />
                  </div>

                  <input
                    type="date"
                    value={newPaymentDate}
                    onChange={(e) => setNewPaymentDate(e.target.value)}
                    className="rounded-lg border border-border bg-input px-3 py-2"
                  />

                  <button
                    type="button"
                    onClick={handleAddPayment}
                    disabled={addingPayment}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {addingPayment ? "Adicionando..." : "Adicionar Pagamento"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Adicione um pagamento ao histórico. O sistema atualizará o
                  valor pago e o saldo automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {formData.items.length > 0 && (
            <div className="rounded-lg bg-accent p-6">
              <h3 className="mb-4 text-lg font-semibold text-accent-foreground">
                Resumo do Pedido
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Total de itens:</span>
                  <div className="font-semibold">{totalAmount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total geral:</span>
                  <div className="text-lg font-semibold">
                    {formatBRL(price)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Valor em aberto:
                  </span>
                  <div className="font-semibold text-destructive">
                    {formatBRL(
                      Math.max(0, price - (formData.installmentsPaid || 0)),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="rounded-lg border border-border px-6 py-3 text-foreground transition-colors hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderEdit;
