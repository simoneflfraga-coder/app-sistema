import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import {
  CheckCircle,
  Loader2,
  Trash2,
  Upload,
  Users,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface ContactData {
  id: string;
  name: string;
  telephone: string;
}

interface ImportResult {
  contact: ContactData;
  success: boolean;
  error?: string;
}

const BATCH_SIZE = 10; // Processa 10 contatos por vez para evitar sobrecarga

const ContactImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedContacts, setSelectedContacts] = useState<ContactData[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Verifica se o navegador suporta Contact Picker API
  const isContactPickerSupported =
    "contacts" in navigator && "ContactsManager" in window;

  const handleSelectContacts = async () => {
    if (!isContactPickerSupported) {
      toast({
        title: "Não suportado",
        description:
          "Seu navegador não suporta a importação de contatos. Tente usar o Chrome ou Edge em um dispositivo móvel.",
        variant: "destructive",
      });
      return;
    }

    try {
      const props = ["name", "tel"];
      const opts = { multiple: true };

      // @ts-ignore - Contact Picker API ainda não tem tipos completos
      const contacts = await navigator.contacts.select(props, opts);

      const formattedContacts: ContactData[] = contacts
        .filter(
          (contact: any) =>
            contact.name && contact.tel && contact.tel.length > 0,
        )
        .map((contact: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          name: contact.name[0] || "Sem nome",
          telephone: contact.tel[0] || "",
        }));

      if (formattedContacts.length === 0) {
        toast({
          title: "Nenhum contato selecionado",
          description: "Selecione contatos que tenham nome e telefone.",
          variant: "destructive",
        });
        return;
      }

      setSelectedContacts(formattedContacts);
      toast({
        title: "Contatos selecionados",
        description: `${formattedContacts.length} contato(s) pronto(s) para importar.`,
      });
    } catch (error) {
      console.error("Erro ao selecionar contatos:", error);
      if (error instanceof Error && error.name !== "AbortError") {
        toast({
          title: "Erro ao selecionar contatos",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleUpdateContact = (
    id: string,
    field: "name" | "telephone",
    value: string,
  ) => {
    setSelectedContacts((contacts) =>
      contacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  const handleDeleteContact = (id: string) => {
    setSelectedContacts((contacts) =>
      contacts.filter((contact) => contact.id !== id),
    );
  };

  const handleImportContacts = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Nenhum contato para importar",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportResults([]);
    setShowResults(false);

    const results: ImportResult[] = [];
    const total = selectedContacts.length;

    // Processa em lotes
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = selectedContacts.slice(i, Math.min(i + BATCH_SIZE, total));

      // Processa cada lote em paralelo
      const batchPromises = batch.map(async (contact) => {
        try {
          // // Cria um CPF temporário baseado no timestamp para garantir unicidade
          // const tempCPF = String(Date.now()).slice(-11).padStart(11, "0");

          const response = await api.createClient({
            name: contact.name.trim(),
            telephone: contact.telephone.replace(/\D/g, "").replace(/^55/, ""),
            address: "",
            anniversary: "",
            // cpf: tempCPF,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          return {
            contact,
            success: true,
          };
        } catch (error) {
          return {
            contact,
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Atualiza o progresso
      const currentProgress = Math.round(((i + batch.length) / total) * 100);
      setImportProgress(currentProgress);
    }

    setImportResults(results);
    setImporting(false);
    setShowResults(true);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast({
        title: "Importação concluída!",
        description: `${successCount} cliente(s) importado(s) com sucesso.`,
      });
    } else if (successCount === 0) {
      toast({
        title: "Erro na importação",
        description: `Todos os ${failCount} contatos falharam na importação.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Importação parcial",
        description: `${successCount} sucesso(s), ${failCount} erro(s).`,
        variant: "destructive",
      });
    }
  };

  const handleFinish = () => {
    navigate("/clients");
  };

  if (!isContactPickerSupported) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Importar Contatos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Importe contatos do seu telefone
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h3 className="mb-2 text-lg font-semibold">Recurso não disponível</h3>
          <p className="mb-4 text-muted-foreground">
            A importação de contatos não é suportada neste navegador. Para usar
            este recurso, acesse através do Chrome ou Edge em um dispositivo
            móvel Android.
          </p>
          <Button onClick={() => navigate("/clients")}>
            Voltar para Clientes
          </Button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const successCount = importResults.filter((r) => r.success).length;
    const failCount = importResults.filter((r) => !r.success).length;

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Resultado da Importação
          </h1>
          <p className="mt-2 text-muted-foreground">
            {successCount} sucesso(s), {failCount} erro(s)
          </p>
        </div>

        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-success/20 bg-success/10 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <div className="text-2xl font-bold text-success">
                    {successCount}
                  </div>
                  <div className="text-sm text-success/80">
                    Importados com sucesso
                  </div>
                </div>
              </div>
            </div>

            {failCount > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <div className="text-2xl font-bold text-destructive">
                      {failCount}
                    </div>
                    <div className="text-sm text-destructive/80">Falharam</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detailed results */}
          {failCount > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">
                Erros de Importação
              </h3>
              <div className="space-y-3">
                {importResults
                  .filter((r) => !r.success)
                  .map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                    >
                      <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                      <div className="flex-1">
                        <div className="font-medium">{result.contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.contact.telephone}
                        </div>
                        {result.error && (
                          <div className="mt-1 text-sm text-destructive">
                            {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={handleFinish} className="flex-1">
              Ir para Lista de Clientes
            </Button>
            <Button
              onClick={() => {
                setShowResults(false);
                setSelectedContacts([]);
                setImportResults([]);
              }}
              variant="outline"
              className="flex-1"
            >
              Importar Mais Contatos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Importar Contatos
        </h1>
        <p className="mt-2 text-muted-foreground">
          Importe contatos do seu telefone e transforme-os em clientes
          cadastrados
        </p>
      </div>

      {selectedContacts.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h3 className="mb-2 text-lg font-semibold">Selecione os contatos</h3>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            Selecione os contatos que deseja importar do seu telefone. Você
            poderá revisar e editar antes de confirmar a importação.
          </p>
          <Button onClick={handleSelectContacts} size="lg">
            <Upload className="mr-2 h-5 w-5" />
            Selecionar Contatos
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedContacts.length} contato(s) selecionado(s)
              </h3>
              <Button
                onClick={handleSelectContacts}
                variant="outline"
                size="sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Adicionar Mais
              </Button>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto">
              {selectedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-accent/50 p-4"
                >
                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Nome
                      </label>
                      <Input
                        value={contact.name}
                        onChange={(e) =>
                          handleUpdateContact(
                            contact.id,
                            "name",
                            e.target.value,
                          )
                        }
                        placeholder="Nome do contato"
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Telefone
                      </label>
                      <Input
                        value={contact.telephone}
                        onChange={(e) =>
                          handleUpdateContact(
                            contact.id,
                            "telephone",
                            e.target.value,
                          )
                        }
                        placeholder="Telefone"
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeleteContact(contact.id)}
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {importing && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Importando contatos...</span>
              </div>
              <Progress value={importProgress} className="mb-2" />
              <p className="text-center text-sm text-muted-foreground">
                {importProgress}% concluído
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleImportContacts}
              disabled={importing || selectedContacts.length === 0}
              className="flex-1"
              size="lg"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Importar {selectedContacts.length} Contato(s)
                </>
              )}
            </Button>
            <Button
              onClick={() => navigate("/clients")}
              variant="outline"
              disabled={importing}
              className="flex-1"
              size="lg"
            >
              Cancelar
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="mb-1 font-medium">Informações sobre a importação:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                Os contatos serão importados em lotes de {BATCH_SIZE} por vez
              </li>
              <li>Apenas nome e telefone serão importados</li>
              {/* <li>
                Um CPF temporário será gerado automaticamente para cada cliente
              </li> */}
              <li>
                Você poderá completar as informações depois na lista de clientes
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactImport;
