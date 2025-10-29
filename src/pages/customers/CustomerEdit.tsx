import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { ArrowLeft, Save, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const CustomerEdit = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    telephone: "",
    address: "",
    anniversary: "",
    cpf: "",
  });

  useEffect(() => {
    if (id) {
      loadClient(id);
    }
  }, [id]);

  const loadClient = async (clientId: string) => {
    try {
      const response = await api.getClient(clientId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        setFormData({
          name: response.data.name || "",
          telephone: response.data.telephone || "",
          address: response.data.address || "",
          anniversary: response.data.anniversary
            ? response.data.anniversary.slice(0, 10)
            : "",
          cpf: response.data.cpf || "",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar cliente",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      navigate("/clients");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers.length === 11 || numbers.length === 0;
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

    // console.log(validateCPF(formData.cpf))

    if (!validateCPF(formData.cpf)) {
      toast({
        title: "CPF deve ter 11 dígitos",
        variant: "destructive",
      });
      return;
    }

    if (!id) return;

    setSaving(true);

    try {
      console.log("Enviando dados:", formData);
      const response = await api.updateClient(id, formData);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Cliente atualizado com sucesso!",
      });

      navigate("/clients");
    } catch (error) {
      toast({
        title: "Erro ao atualizar cliente",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      navigate("/clients");
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
      <div className="relative mx-auto mb-8 flex max-w-2xl items-center justify-center gap-4">
        <button
          onClick={() => navigate("/clients")}
          className="absolute left-0 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="">
          <h1 className="text-3xl text-center font-bold text-foreground">Editar Cliente</h1>
          <p className="mt-2 text-muted-foreground">
            Atualize as informações do cliente
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Informações do Cliente
              </h2>
              <p className="text-sm text-muted-foreground">
                Preencha os dados necessários
              </p>
            </div>
            <div
              onClick={() => {
                deleteCustomer(id);
              }}
              className="ml-auto mr-2 cursor-pointer rounded-[6px] p-1 text-red-600 hover:bg-red-600/20"
            >
              <Trash2 />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Nome completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <label
                htmlFor="telephone"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Telefone
              </label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label
                htmlFor="cpf"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                CPF
              </label>
              <input
                type="text"
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                // required
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label
                htmlFor="anniversary"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Data de Aniversário
              </label>
              <input
                type="date"
                id="anniversary"
                name="anniversary"
                value={formData.anniversary}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Endereço
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Digite o endereço completo"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
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
              onClick={() => navigate("/clients")}
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

export default CustomerEdit;
