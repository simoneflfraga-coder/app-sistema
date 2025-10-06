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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function RegistrationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    previousBalance: 0, // em REAIS no UI
    newBalance: 0, // em REAIS no UI
    type: "Out" as "Out" | "In",
    value: 0, // em REAIS no UI
    category: "",
    description: "",
    tags: [] as string[],
    paid: false,
  });

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (id) {
      loadRegistro();
    }
  }, [id]);

  const loadRegistro = async () => {
    if (!id) return;

    try {
      const response = await api.getRegistration(id);
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const registro = response.data;
        // Convertendo CENTAVOS -> REAIS para preencher o form
        setFormData({
          previousBalance:
            registro.previousBalance != null
              ? registro.previousBalance / 100
              : 0,
          newBalance:
            registro.newBalance != null ? registro.newBalance / 100 : 0,
          type: registro.type,
          value: registro.value != null ? registro.value / 100 : 0,
          category: registro.category,
          description: registro.description,
          tags: registro.tags || [],
          paid: !!registro.paid,
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar registro",
        variant: "destructive",
      });
      navigate("/registrations");
    } finally {
      setLoadingData(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const calculateNewBalance = () => {
    const { previousBalance, type, value } = formData;
    // previousBalance e value estão em REAIS no UI
    const newBalance =
      type === "In" ? previousBalance + value : previousBalance - value;

    setFormData((prev) => ({
      ...prev,
      newBalance,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.description || formData.value <= 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!id) return;

    setLoading(true);

    try {
      // Converter REAIS -> CENTAVOS antes de enviar
      const payload = {
        previousBalance: Math.round((formData.previousBalance ?? 0) * 100),
        newBalance: Math.round((formData.newBalance ?? 0) * 100),
        type: formData.type,
        value: Math.round((formData.value ?? 0) * 100),
        category: formData.category,
        description: formData.description,
        tags: formData.tags,
        paid: formData.paid,
      };

      const response = await api.updateRegistration(id, payload);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Sucesso",
        description: "Registro atualizado com sucesso!",
      });

      navigate("/registrations");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar registro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando registro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="text-2xl font-bold text-primary">
              Editar Registro Financeiro
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo*</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "Out" | "In") => {
                      setFormData((prev) => ({ ...prev, type: value }));
                      setTimeout(calculateNewBalance, 0);
                    }}
                  >
                    <SelectTrigger className="border-primary/20 focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In">Entrada</SelectItem>
                      <SelectItem value="Out">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Valor*</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        value: parseFloat(e.target.value) || 0,
                      }))
                    }
                    onBlur={calculateNewBalance}
                    className="border-primary/20 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria*</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="Ex: Vendas, Compras, Despesas..."
                    className="border-primary/20 focus:border-primary"
                  />
                </div>

                {/* <div className="flex items-center space-x-2">
                  <Switch
                    id="paid"
                    checked={formData.paid}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, paid: !!checked }))
                    }
                  />
                  <Label htmlFor="paid">Pago</Label>
                </div> */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição*</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Descreva o registro financeiro..."
                  className="border-primary/20 focus:border-primary min-h-20"
                />
              </div>

              <div className="space-y-4">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Adicionar tag..."
                    className="border-primary/20 focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    className="border-primary/20 hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <div
                        key={index}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/registrations")}
                  className="flex-1 border-primary/20 hover:bg-primary/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
