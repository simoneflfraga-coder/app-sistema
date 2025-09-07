import { useToast } from "@/hooks/use-toast";
import { api, Product } from "@/services/api";
import {
  DollarSign,
  HandCoins,
  Package,
  PiggyBank,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ProductList = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.getProducts();

      if (response.error) {
        throw new Error(response.error);
      }

      setProducts(response.data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar produtos",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map((p) => p.category))].filter(
    Boolean
  );

  // Recebe valor em CENTAVOS e retorna string em R$
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0)
      return { text: "Sem estoque", color: "text-destructive" };
    if (quantity <= 5) return { text: "Estoque baixo", color: "text-warning" };
    return { text: "Em estoque", color: "text-success" };
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seu estoque de produtos
          </p>
        </div>
        <Link
          to="/products/new"
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Products list */}
      {filteredProducts.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-muted-foreground mb-4">
            {searchTerm || categoryFilter
              ? "Nenhum produto encontrado"
              : "Nenhum produto cadastrado"}
          </div>
          {!searchTerm && !categoryFilter && (
            <Link
              to="/products/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Cadastrar primeiro produto
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock);
            return (
              <Link
                to={`/products/${product._id}/edit`}
                key={product._id}
                className={`${
                  product.stock > 0 ? "" : "opacity-40"
                } bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow`}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span>{product.code}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Categoria:
                    </span>
                    <span className="text-sm font-medium">
                      {product.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Estoque:
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {product.stock} unidades
                      </div>
                      <div className={`text-xs ${stockStatus.color}`}>
                        {stockStatus.text}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Preço de venda:
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Custo:
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(product.value)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Lucro:
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(product.price - product.value)}
                      </span>
                    </div>
                  </div>

                  {product.datePurchase && (
                    <div className="text-xs text-muted-foreground">
                      Comprado em:{" "}
                      {new Date(product.datePurchase).toLocaleDateString(
                        "pt-BR"
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-accent rounded-lg p-4">
          <div className="flex items-center gap-2 text-accent-foreground">
            <Package className="h-5 w-5" />
            <div>
              <div className="text-sm font-medium">Total de produtos</div>
              <div className="text-2xl font-bold">
                {filteredProducts.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-accent rounded-lg p-4">
          <div className="flex items-center gap-2 text-accent-foreground">
            <DollarSign className="h-5 w-5" />
            <div>
              <div className="text-sm font-medium">Valor total estoque</div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredProducts.reduce(
                    (sum, p) => sum + p.value * p.stock,
                    0
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-accent rounded-lg p-4">
          <div className="flex items-center gap-2 text-accent-foreground">
            <PiggyBank className="h-5 w-5" />
            <div>
              <div className="text-sm font-medium">Receita total esperada</div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredProducts.reduce(
                    (sum, p) => sum + p.price * p.stock,
                    0
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-accent rounded-lg p-4">
          <div className="flex items-center gap-2 text-accent-foreground">
            <HandCoins className="h-5 w-5" />
            <div>
              <div className="text-sm font-medium">Lucro total esperado</div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredProducts.reduce(
                    (sum, p) => sum + (p.price - p.value) * p.stock,
                    0
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-accent rounded-lg p-4">
          <div className="flex items-center gap-2 text-accent-foreground">
            <Tag className="h-5 w-5" />
            <div>
              <div className="text-sm font-medium">Categorias</div>
              <div className="text-2xl font-bold">{categories.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
