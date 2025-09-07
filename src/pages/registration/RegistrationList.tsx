import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api, Financial, Registration } from "@/services/api";
import {
  DollarSign,
  Filter,
  PiggyBank,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegistrationList() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [registros, setRegistros] = useState<Registration[]>([]);
  const [financeiro, setFinanceiro] = useState<Financial[]>([]);
  const [filteredRegistros, setFilteredRegistros] = useState<Registration[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    type: "*",
    category: "",
    tag: "",
    // paid: "",
    createAt: "",
    dateTo: "",
    dateFrom: "",
    valueMin: "",
    valueMax: "",
  });

  useEffect(() => {
    loadRegistros();
    loadFinanceiros();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [registros, filters]);

  const loadRegistros = async () => {
    try {
      const response = await api.getRegistrations();
      if (response.error) {
        throw new Error(response.error);
      }
      setRegistros(response.data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar registros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFinanceiros = async () => {
    try {
      const response = await api.getFinancials();
      if (response.error) {
        throw new Error(response.error);
      }

      setFinanceiro(response.data || []);
      // console.log(response.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar financeiro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Recebe CENTAVOS e retorna string formatada em R$ com 2 casas (ex: R$ 420,40)
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);

  // Recebe CENTAVOS e retorna string formatada em R$ SEM casas decimais (ex: R$ 420)
  // Usa truncamento (remove centavos): 42040 -> 420 ; -42040 -> -420
  const formatCurrencyNoCents = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.trunc(cents / 100));

  const applyFilters = () => {
    let filtered = [...registros];

    if (filters.search) {
      filtered = filtered.filter(
        (registro) =>
          registro.description
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          registro.category.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.type !== "*") {
      filtered = filtered.filter((registro) => registro.type === filters.type);
    }

    if (filters.category) {
      filtered = filtered.filter((registro) =>
        registro.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    if (filters.tag) {
      filtered = filtered.filter((registro) =>
        registro.tags.some((tag) =>
          tag.toLowerCase().includes(filters.tag.toLowerCase())
        )
      );
    }

    // if (filters.paid) {
    //   filtered = filtered.filter(
    //     (registro) => registro.paid === (filters.paid === "true")
    //   );
    // }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      filtered = filtered.filter((r) => {
        const dateStr = (r.date ?? r.createAt) as string;
        const regDate = new Date(dateStr);
        return !isNaN(regDate.getTime()) && regDate >= from;
      });
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        const dateStr = (r.date ?? r.createAt) as string;
        const regDate = new Date(dateStr);
        return !isNaN(regDate.getTime()) && regDate <= to;
      });
    }

    if (filters.valueMin) {
      const minCent = Math.round(parseFloat(filters.valueMin) * 100);
      filtered = filtered.filter((registro) => registro.value >= minCent);
    }

    if (filters.valueMax) {
      const maxCent = Math.round(parseFloat(filters.valueMax) * 100);
      filtered = filtered.filter((registro) => registro.value <= maxCent);
    }

    filtered.sort(
      (a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime()
    );

    setFilteredRegistros(filtered);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "*",
      category: "",
      tag: "",
      // paid: "",
      createAt: "",
      dateFrom: "",
      dateTo: "",
      valueMin: "",
      valueMax: "",
    });
  };

  const getStats = () => {
    const totalEntradas = filteredRegistros
      .filter((r) => r.type === "In")
      .reduce((sum, r) => sum + r.value, 0);

    const totalSaidas = filteredRegistros
      .filter((r) => r.type === "Out")
      .reduce((sum, r) => sum + r.value, 0);

    return { totalEntradas, totalSaidas };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando registros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Registros Financeiros
            </h1>
            <p className="text-muted-foreground mt-1">
              Controle de entradas e saídas
            </p>
          </div>
          <Button
            onClick={() => navigate("/registrations/new")}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Entradas
                  </p>
                  {/* mostra sem centavos */}
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrencyNoCents(financeiro[0]?.cashInflow ?? 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Saídas</p>
                  {/* mostra sem centavos */}
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrencyNoCents(financeiro[0]?.moneyOut ?? 0)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  {/* mostra sem centavos */}
                  <p
                    className={`text-2xl font-bold ${
                      (financeiro[0]?.current ?? 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrencyNoCents(
                      (financeiro[0]?.cashInflow ?? 0) -
                        (financeiro[0]?.moneyOut ?? 0)
                    )}
                  </p>
                </div>
                <DollarSign
                  className={`h-8 w-8 ${
                    (financeiro[0]?.current ?? 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Caixa $</p>
                  {/* mostra sem centavos */}
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrencyNoCents(financeiro[0]?.current ?? 0)}
                  </p>
                </div>
                <PiggyBank className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Registros
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {filteredRegistros.length}
                  </p>
                </div>
                <Filter className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Descrição ou categoria..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="pl-10 border-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="border-primary/20 focus:border-primary">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Todos</SelectItem>
                    <SelectItem value="In">Entrada</SelectItem>
                    <SelectItem value="Out">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  placeholder="Filtrar por categoria..."
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <Input
                  id="tag"
                  placeholder="Filtrar por tag..."
                  value={filters.tag}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, tag: e.target.value }))
                  }
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data De</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: e.target.value,
                    }))
                  }
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Data Até</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valueMin">Valor Mínimo</Label>
                <Input
                  id="valueMin"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.valueMin}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      valueMin: e.target.value,
                    }))
                  }
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valueMax">Valor Máximo</Label>
                <Input
                  id="valueMax"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.valueMax}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      valueMax: e.target.value,
                    }))
                  }
                  className="border-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-primary/20 hover:bg-primary/10"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Registros */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="text-lg font-semibold text-primary">
              Lista de Registros - ({filteredRegistros.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Tags</TableHead>
                    {/* <TableHead>Status</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistros.map((registro) => (
                    <TableRow
                      key={registro._id}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() =>
                        navigate(`/registrations/${registro._id}/edit`)
                      }
                    >
                      <TableCell>
                        {new Date(registro.createAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            registro.type === "In" ? "default" : "destructive"
                          }
                          className={
                            registro.type === "In"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {registro.type === "In" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {registro.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{registro.category}</Badge>
                      </TableCell>
                      <TableCell
                        className={`font-semibold ${
                          registro.type === "In"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {registro.type === "In" ? "+" : "-"}{" "}
                        {formatCurrency(registro.value)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(registro.newBalance ?? 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {registro.tags.slice(0, 2).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {registro.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{registro.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {/* <TableCell>
                        <Badge
                          variant={registro.paid ? "default" : "secondary"}
                          className={
                            registro.paid
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {registro.paid ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredRegistros.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum registro encontrado
                </p>
                <Button
                  onClick={() => navigate("/registrations/new")}
                  className="mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Registro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
