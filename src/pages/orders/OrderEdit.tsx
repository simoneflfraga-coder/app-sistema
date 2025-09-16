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

const OrderEdit = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    items: [] as OrderItem[], // aqui unitPrice será mantido em REAIS no UI
    installmentsTotal: 1, // agora representa DIA DO MÊS (1..31)
    installmentsPaid: 0, // aqui REPRESENTA REAIS no UI (converter pra centavos ao enviar)
  });

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

  const loadOrder = async (orderId: string) => {
    try {
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
          })
        );

        setFormData({
          customerId: response.data.customerId,
          items: itemsInReais,
          installmentsTotal: response.data.installmentsTotal || 1,
          // installmentsPaid no backend está em CENTAVOS -> converter pra REAIS pro input
          installmentsPaid: (response.data.installmentsPaid || 0) / 100,
        });
      }
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
    value: string | number
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
      0
    );
    // item.unitPrice está em REAIS na UI → price em REAIS
    const price = formData.items.reduce(
      (sum, item) => sum + item.amount * item.unitPrice,
      0
    );
    return { totalAmount, price };
  };

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

    // valida day 1..31
    if (formData.installmentsTotal < 1 || formData.installmentsTotal > 31) {
      toast({
        title: "Dia de vencimento inválido",
        description: "Escolha um dia entre 1 e 31 para o vencimento.",
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
        (formData.installmentsPaid || 0) * 100
      );
      const remainingCents = Math.max(0, priceCents - installmentsPaidCents);

      const orderData = {
        customerId: formData.customerId,
        items: itemsInCentavos,
        totalAmount, // CORREÇÃO: nome correto
        // price em CENTAVOS
        price: priceCents,
        // dia do vencimento
        installmentsTotal: formData.installmentsTotal,
        // valor já pago em CENTAVOS
        installmentsPaid: installmentsPaidCents,
        // quanto falta pagar (CENTAVOS) — backend também recalcula, mas enviamos para satisfazer tipos
        paid: remainingCents,
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

  const { totalAmount, price } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // helper para formatar valores (REAIS)
  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/orders")}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Pedido</h1>
          <p className="text-muted-foreground mt-2">
            Atualize as informações do pedido
          </p>
        </div>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente Selection */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="customerId"
                  className="block text-sm font-medium text-foreground mb-2"
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
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="installmentsTotal"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Dia do vencimento
                </label>
                <select
                  id="installmentsTotal"
                  value={formData.installmentsTotal}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      installmentsTotal: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground mt-2">
                  A parcela vence todo dia selecionado do mês.
                </p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Produtos
              </h3>
              <button
                type="button"
                onClick={addProduct}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Produto
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          updateItem(index, "productId", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
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

                    <div className="flex-none items-center gap-2 z-10">
                      <label className="block text-sm font-medium text-foreground mb-2 w-full">
                        Quantidade
                      </label>
                      <div className="flex items-center justify-center border border-border rounded-lg">
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(
                              index,
                              "amount",
                              Math.max(1, item.amount - 1)
                            )
                          }
                          className="p-2 hover:bg-accent transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-4 py-2 text-center min-w-[60px]">
                          {item.amount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(index, "amount", item.amount + 1)
                          }
                          className="p-2 hover:bg-accent transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="w-25">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Preço unitário (R$)
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      />
                    </div>

                    <div className="flex items-end flex-col gap-2">
                      <div className="text-sm text-end font-medium text-foreground">
                        Subtotal: {formatBRL(item.amount * item.unitPrice)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {formData.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto adicionado. Clique em "Adicionar Produto" para
                  começar.
                </div>
              )}
            </div>
          </div>

          {/* Parcelamento (ajustado) */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Parcelamento
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Valor já pago (R$)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">R$</span>
                  <input
                    type="number"
                    value={formData.installmentsPaid}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        installmentsPaid: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                    step="0.01"
                    className="px-3 py-2 bg-input border border-border rounded-lg w-48"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Informe quanto o cliente já pagou (ex.: 10.00 → R$50,00).
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {formData.items.length > 0 && (
            <div className="bg-accent rounded-lg p-6">
              <h3 className="text-lg font-semibold text-accent-foreground mb-4">
                Resumo do Pedido
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total de itens:</span>
                  <div className="font-semibold">{totalAmount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total geral:</span>
                  <div className="font-semibold text-lg">
                    {formatBRL(price)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Valor em aberto:
                  </span>
                  <div className="font-semibold text-destructive">
                    {formatBRL(
                      Math.max(0, price - (formData.installmentsPaid || 0))
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
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="px-6 py-3 border border-border rounded-lg text-foreground hover:bg-accent transition-colors"
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
