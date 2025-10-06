import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CustomerCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    telephone: '',
    address: '',
    anniversary: '',
    cpf: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11 || cleanCPF.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCPF(formData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.createClient(formData);
      
      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Cliente criado com sucesso!",
        description: "O cliente foi adicionado ao sistema.",
      });
      
      navigate('/clients');
    } catch (error) {
      toast({
        title: "Erro ao criar cliente",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Novo Cliente</h1>
        <p className="text-muted-foreground mt-2">Cadastre um novo cliente no sistema</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Nome completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-foreground mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formatPhone(formData.telephone)}
                onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-foreground mb-2">
                CPF
              </label>
              <input
                type="text"
                id="cpf"
                name="cpf"
                value={formatCPF(formData.cpf)}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                // required
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label htmlFor="anniversary" className="block text-sm font-medium text-foreground mb-2">
                Data de aniversário
              </label>
              <input
                type="date"
                id="anniversary"
                name="anniversary"
                value={formData.anniversary}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                Endereço
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Rua, número, bairro, cidade, CEP"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/clients')}
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

export default CustomerCreate;