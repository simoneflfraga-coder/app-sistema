import { useToast } from "@/hooks/use-toast";
import { api, Client } from "@/services/api";
import {
  Calendar,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const CustomerList = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.getClients();

      if (response.error) {
        throw new Error(response.error);
      }

      setClients(response.data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar clientes",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.telephone.includes(searchTerm) ||
      client.cpf?.includes(searchTerm),
  );

  const formatCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const deleteCustomer = async (id: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja remover este cliente?",
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await api.deleteClient(id);
      if (response.error) {
        throw new Error(response.error);
      }
      setClients((prev) => prev.filter((client) => client._id !== id));
      toast({
        title: "Cliente removido",
        description: "O cliente foi removido com sucesso.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover cliente",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie seus clientes cadastrados
          </p>
        </div>
        <div className="mt-4 flex gap-2 sm:mt-0">
          <Link
            to="/clients/import"
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <Upload className="h-4 w-4" />
            Importar Contatos
          </Link>
          <Link
            to="/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-3 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Client list */}
      {filteredClients.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mb-4 text-muted-foreground">
            {searchTerm
              ? "Nenhum cliente encontrado"
              : "Nenhum cliente cadastrado"}
          </div>
          {!searchTerm && (
            <Link
              to="/clients/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Cadastrar primeiro cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            return (
              <Link
                to={`/clients/${client._id}/edit`}
                key={client._id}
                className="group relative rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4">
                  <h3 className="mb-1 text-lg font-semibold text-foreground">
                    {client.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {client.cpf
                      ? `CPF: ${formatCPF(client.cpf)}`
                      : "CPF não informado"}
                  </p>
                </div>

                <div className="space-y-3">
                  {client.telephone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{formatPhone(client.telephone)}</span>
                    </div>
                  )}

                  {client.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                  )}

                  {client.anniversary && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Aniversário: {formatDate(client.anniversary)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    // garante que a navegação seja impedida
                    e.preventDefault();
                    deleteCustomer(client._id);
                  }}
                  className="absolute bottom-5 right-5 scale-90 rounded-[6px] bg-red-600/20 p-1 text-red-600 opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
                >
                  <Trash2 className="" />
                </button>
              </Link>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 rounded-lg bg-accent p-4">
        <div className="text-sm text-accent-foreground">
          <span className="font-medium">{filteredClients.length}</span>{" "}
          cliente(s) encontrado(s)
          {searchTerm && (
            <span className="ml-2">
              de <span className="font-medium">{clients.length}</span> total
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
