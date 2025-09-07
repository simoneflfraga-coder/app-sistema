import { useToast } from "@/hooks/use-toast";
import { api, Client, OrderItem, Product } from "@/services/api";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

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
      (item) => item.productId === productId
    );

    if (existingItem) {
      setOrderItems((items) =>
        items.map((item) =>
          item.productId === productId
            ? { ...item, amount: Math.min(item.amount + 1, product.stock) }
            : item
        )
      );
    } else {
      setOrderItems((items) => [
        ...items,
        {
          productId,
          amount: 1,
          // IMPORTANT: product.price vem em CENTAVOS do backend.
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
        item.productId === productId ? { ...item, amount: validQty } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setOrderItems((items) =>
      items.filter((item) => item.productId !== productId)
    );
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setOrderItems((items) =>
      items.map((item) =>
        item.productId === productId
          ? { ...item, unitPrice: Math.max(0.0, newPrice) } // unitPrice em REAIS
          : item
      )
    );
  };

  const totalQty = orderItems.reduce((sum, item) => sum + item.amount, 0);
  const totalPrice = orderItems.reduce(
    (sum, item) => sum + item.amount * item.unitPrice, // unitPrice em REAIS -> totalPrice em REAIS
    0
  );

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

    setLoading(true);

    try {
      const orderData = {
        customerId: selectedCustomerId,
        items: orderItems.map((item) => ({
          productId: item.productId,
          amount: item.amount,
          // converter unitPrice (REAIS) -> CENTAVOS para a API
          unitPrice: Math.round(item.unitPrice * 100),
        })),
        totalAmount: totalQty,
        // enviar totalPrice em CENTAVOS
        price: Math.round(totalPrice * 100),
        installmentsTotal: installments,
        installmentsPaid: 0,
        paid: false,
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
    (p) => p.stock > 0 && !orderItems.some((item) => item.productId === p._id)
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Novo Pedido</h1>
        <p className="text-muted-foreground mt-2">
          Crie um novo pedido para um cliente
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Cliente Selection */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground">Cliente</h2>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            required
            className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Adicionar Produtos
          </h2>

          {availableProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {availableProducts.map((product) => (
                <div
                  key={product._id}
                  className="border border-border rounded-lg p-4"
                >
                  <h3 className="font-medium text-foreground mb-2">
                    {product.name}
                  </h3>
                  <div className="text-sm text-muted-foreground mb-2">
                    <div>Código: {product.code}</div>
                    <div>Estoque: {product.stock}</div>
                    <div className="font-medium text-primary">
                      {/* product.price está em CENTAVOS -> converter para REAIS para exibir */}
                      {formatCurrency(product.price / 100)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(product._id)}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {orderItems.length > 0
                ? "Todos os produtos disponíveis foram adicionados"
                : "Nenhum produto disponível no estoque"}
            </div>
          )}
        </div>

        {/* Order Items */}
        {orderItems.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Itens do Pedido
            </h2>

            <div className="space-y-4">
              {orderItems.map((item) => (
                <div
                  key={item.productId}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
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
                        className="p-2 rounded-lg border border-border hover:bg-accent"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 py-2 bg-input rounded-lg min-w-16 text-center">
                        {item.amount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.amount + 1)
                        }
                        className="p-2 rounded-lg border border-border hover:bg-accent"
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
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0.00"
                        step="0.01"
                        className="w-24 px-3 py-2 bg-input border border-border rounded-lg text-center"
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
                      className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {orderItems.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Resumo do Pedido
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="installments"
                  className="text-sm font-medium text-foreground"
                >
                  Número de parcelas:
                </label>
                <select
                  id="installments"
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value))}
                  className="px-3 py-2 bg-input border border-border rounded-lg"
                >
                  {[1, 2, 3, 4, 5, 6, 10, 12].map((num) => (
                    <option key={num} value={num}>
                      {num}x{" "}
                      {num > 1 ? `de ${formatCurrency(totalPrice / num)}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
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
                {installments > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {installments}x de:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(totalPrice / installments)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={loading || orderItems.length === 0 || !selectedCustomerId}
            className="flex-1 bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Criando pedido..." : "Criar Pedido"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="flex-1 bg-secondary text-secondary-foreground py-3 px-6 rounded-lg font-medium hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderCreate;
