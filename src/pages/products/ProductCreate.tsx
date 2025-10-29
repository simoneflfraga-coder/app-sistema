import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ProductCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    stock: 0,
    category: "",
    value: 0,
    price: 0,
    datePurchase: "",
    code: "",
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (formData.stock <= 0) throw new Error("A quantidade deve ser maior que zero.");
      if (formData.value <= 0 || formData.price <= 0) throw new Error("Valor e preço devem ser maiores que zero.");

      const response = await api.createProduct({
        ...formData,
        value: Math.round(formData.value * 100),
        price: Math.round(formData.price * 100),
        datePurchase: formData.datePurchase
          ? new Date(formData.datePurchase)
          : undefined,
      });

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Produto criado com sucesso!",
        description: "O produto foi adicionado ao estoque.",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/products");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar produto",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    mutate();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const categories = [
    "Perfumaria",
    "Roupas",
    "Maquiagem",
    "Cosmeticos",
    "Outros",
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Novo Produto</h1>
        <p className="text-muted-foreground mt-2">
          Cadastre um novo produto no estoque
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Nome do produto *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Digite o nome do produto"
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Código do produto *
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: PROD001"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Categoria *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="stock"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Quantidade em estoque *
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label
                htmlFor="value"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Valor de custo *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <input
                  type="number"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Preço de venda *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="datePurchase"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Data de compra
              </label>
              <input
                type="date"
                id="datePurchase"
                name="datePurchase"
                value={formData.datePurchase}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview da margem de lucro */}
          {formData.value > 0 && formData.price > 0 && (
            <div className="bg-accent rounded-lg p-4">
              <div className="text-sm text-accent-foreground">
                <div className="flex justify-between items-center mb-2">
                  <span>Margem de lucro:</span>
                  <span className="font-medium">
                    {formatCurrency(formData.price - formData.value)} (
                    {(
                      ((formData.price - formData.value) / formData.price) *
                      100
                    ).toFixed(1)}
                    % )
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Custo: {formatCurrency(formData.value)} | Venda:{" "}
                  {formatCurrency(formData.price)}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? "Salvando..." : "Salvar Produto"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="flex-1 bg-secondary text-secondary-foreground py-3 px-6 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductCreate;
