import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { ArrowLeft, Package, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const ProductEdit = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    stock: 0,
    category: "",
    value: 0,
    price: 0,
    datePurchase: "",
    code: "",
  });

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      const response = await api.getProduct(productId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        setFormData({
          name: response.data.name,
          stock: response.data.stock,
          category: response.data.category,
          // converter CENTAVOS -> REAIS para preencher os inputs
          value: response.data.value / 100,
          price: response.data.price / 100,
          datePurchase: new Date(response.data.datePurchase)
            .toISOString()
            .slice(0, 10),
          code: response.data.code,
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar produto",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
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

    if (!formData.name.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (formData.stock < 0) {
      toast({
        title: "Quantidade deve ser maior ou igual a zero",
        variant: "destructive",
      });
      return;
    }

    if (formData.value < 0 || formData.price < 0) {
      toast({
        title: "Valor e preço devem ser positivos",
        variant: "destructive",
      });
      return;
    }

    if (!id) return;

    setSaving(true);

    try {
      const response = await api.updateProduct(id, {
        ...formData,
        value: Math.round(formData.value * 100),
        price: Math.round(formData.price * 100),
        datePurchase: new Date(formData.datePurchase),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Produto atualizado com sucesso!",
      });

      navigate("/products");
    } catch (error) {
      toast({
        title: "Erro ao atualizar produto",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/products")}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Produto</h1>
          <p className="text-muted-foreground mt-2">
            Atualize as informações do produto
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-lg p-6 space-y-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Informações do Produto
              </h2>
              <p className="text-sm text-muted-foreground">
                Preencha os dados necessários
              </p>
            </div>
          </div>

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
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="Digite o nome do produto"
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Código
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="Código do produto"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Categoria
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              >
                <option value="">Selecione uma categoria</option>
                <option value="Eletrônicos">Eletrônicos</option>
                <option value="Roupas">Roupas</option>
                <option value="Casa e Jardim">Casa e Jardim</option>
                <option value="Esportes">Esportes</option>
                <option value="Livros">Livros</option>
                <option value="Outros">Outros</option>
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
                onChange={handleInputChange}
                min="0"
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="0"
              />
            </div>

            <div>
              <label
                htmlFor="value"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Valor de custo (R$) *
              </label>
              <input
                type="number"
                id="value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="0,00"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Preço de venda (R$) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="0,00"
              />
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
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
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
              onClick={() => navigate("/products")}
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

export default ProductEdit;
