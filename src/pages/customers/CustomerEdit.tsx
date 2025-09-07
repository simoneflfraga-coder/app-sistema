import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { ArrowLeft, Save, User } from "lucide-react";
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
          name: response.data.name,
          telephone: response.data.telephone,
          address: response.data.address,
          anniversary: response.data.anniversary.slice(0, 10),
          cpf: response.data.cpf,
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers.length === 11;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto relative flex justify-center items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/clients")}
          className="inline-flex absolute items-center left-0 gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="">
          <h1 className="text-3xl font-bold text-foreground">Editar Cliente</h1>
          <p className="text-muted-foreground mt-2">
            Atualize as informações do cliente
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-lg p-6 space-y-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 bg-primary/10 rounded-lg">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground mb-2"
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
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <label
                htmlFor="telephone"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Telefone
              </label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label
                htmlFor="cpf"
                className="block text-sm font-medium text-foreground mb-2"
              >
                CPF *
              </label>
              <input
                type="text"
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label
                htmlFor="anniversary"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Data de Aniversário
              </label>
              <input
                type="date"
                id="anniversary"
                name="anniversary"
                value={formData.anniversary}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Endereço
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground resize-none"
                placeholder="Digite o endereço completo"
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
              onClick={() => navigate("/clients")}
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

export default CustomerEdit;
