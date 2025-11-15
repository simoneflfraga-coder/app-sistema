// api.ts
// Configuração centralizada da API
const API_BASE_URL = "https://api-simone.vercel.app";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export class ApiService {
  private baseURL = API_BASE_URL;

  // cache em memória do access token (mais seguro do que localStorage)
  private accessToken: string | null = null;

  // usado para deduplicar chamadas de refresh (evita N refresh simultâneos)
  private refreshingPromise: Promise<boolean> | null = null;

  // chave usada no sessionStorage
  private readonly ACCESS_TOKEN_KEY = "012248912648912";

  // get/set do token (memória)
  setToken(token: string | null) {
    this.accessToken = token;

    try {
      if (token) {
        sessionStorage.setItem(this.ACCESS_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      }
    } catch (e) {
      // em ambientes restritos sessionStorage pode falhar; apenas loga
      console.warn("sessionStorage inacessível:", e);
    }
  }

  getToken(): string | null {
    // 1) retorna se já estiver em memória
    if (this.accessToken) return this.accessToken;

    // 2) tenta recuperar do sessionStorage (persistência entre reloads)
    try {
      const t = sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
      if (t) {
        this.accessToken = t;
        return t;
      }
    } catch (e) {
      console.warn("sessionStorage inacessível:", e);
    }

    // 3) não encontrou token
    return null;
  }

  // logout local + chamada para o backend
  async logout() {
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // ignora erros ao dar logout (ex: rede)
      console.error("Erro no logout:", e);
    } finally {
      this.setToken(null);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retried = false,
  ): Promise<ApiResponse<T>> {
    try {
      // montar headers padrão
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      };

      // inserir Authorization se houver token em memória
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        credentials: "include", // ✅ ESSENCIAL
      });

      // se for 401 e ainda não tentamos renovar -> tenta refresh e re-executa (uma vez)
      if (response.status === 401 && !retried) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // tenta novamente a requisição original, agora com novo token
          return this.request<T>(endpoint, options, true);
        } else {
          // não conseguiu renovar -> desloga localmente
          await this.logout();
          return { error: "Não autorizado. Faça login novamente." };
        }
      }

      // Se não for ok e não for 401 (ou já retry), tenta extrair mensagem do body
      if (!response.ok) {
        const text = await response.text();
        const message = text
          ? this.safeParseTextMessage(text)
          : response.statusText;
        return { error: message || `Erro ${response.status}` };
      }

      // resposta ok -> ler body (pode ser 204 sem body)
      const text = await response.text();
      if (!text) return { data: undefined };

      const data = JSON.parse(text) as T;
      return { data };
    } catch (error) {
      console.error("API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Tenta renovar token de acesso
  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshingPromise) return this.refreshingPromise;

    this.refreshingPromise = (async () => {
      try {
        const res = await fetch(`${this.baseURL}/auth/refresh`, {
          method: "POST",
          credentials: "include", // envia cookie HttpOnly
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          return false;
        }

        // backend deve retornar { accessToken: "..." }
        const body = await res.json().catch(() => null);
        const newToken = body?.accessToken;

        if (newToken && typeof newToken === "string") {
          this.setToken(newToken);
          return true;
        }

        return false;
      } catch (e) {
        console.error("Erro ao tentar renovar token:", e);
        return false;
      } finally {
        // limpar promise depois que terminar
        this.refreshingPromise = null;
      }
    })();

    return this.refreshingPromise;
  }

  //Rotas Públicas
  async getPublicClient(id: string) {
    return this.request<PublicClient>(`/public/customer/${id}`);
  }

  async getPublicOrder(id: string) {
    return this.request<Order>(`/public/order/${id}`);
  }

  async getPublicProducts() {
    return this.request<PublicProduct>(`/public/product/`);
  }

  // LOGIN: chama POST /auth com email + password e guarda token automaticamente
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const res = await fetch(`${this.baseURL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // cookies serão salvos (refresh token)
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { error: errText || "Erro ao fazer login" };
      }

      const data = await res.json();

      // o backend retorna { accessToken }
      if (data?.accessToken) {
        this.setToken(data.accessToken);
      }
      return { data };
    } catch (e) {
      console.error("Erro no login:", e);
      return { error: e instanceof Error ? e.message : "Erro desconhecido" };
    }
  }

  // Método utilitário para checar se estamos logados
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Cliente endpoints
  async getClients() {
    return this.request<Client[]>("/customer/");
  }

  async getClient(id: string) {
    return this.request<Client>(`/customer/${id}`);
  }

  async createClient(client: Omit<Client, "_id">) {
    return this.request<Client>("/customer/create", {
      method: "POST",
      body: JSON.stringify(client),
    });
  }

  async updateClient(id: string, client: Partial<Client>) {
    return this.request<Client>(`/customer/${id}`, {
      method: "PUT",
      body: JSON.stringify(client),
    });
  }

  async deleteClient(id: string) {
    return this.request<Client>(`/customer/${id}`, {
      method: "DELETE",
    });
  }

  // Produto endpoints
  async getProducts() {
    return this.request<Product[]>("/product/");
  }

  async getProduct(id: string) {
    return this.request<Product>(`/product/${id}`);
  }

  async createProduct(product: Omit<Product, "_id">) {
    return this.request<Product>("/product/create", {
      method: "POST",
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: Partial<Product>) {
    return this.request<Product>(`/product/${id}`, {
      method: "PUT",
      body: JSON.stringify(product),
    });
  }

  // Pedido endpoints
  async getOrders() {
    return this.request<Order[]>("/order/");
  }

  async createOrder(order: Omit<Order, "_id" | "date">) {
    return this.request<Order>("/order/create", {
      method: "POST",
      body: JSON.stringify(order),
    });
  }

  async getOrder(id: string) {
    return this.request<Order>(`/order/${id}`);
  }

  async updateOrder(id: string, order: Partial<Order>) {
    return this.request<Order>(`/order/${id}`, {
      method: "PUT",
      body: JSON.stringify(order),
    });
  }

  async deleteOrder(id: string) {
    return this.request<Order>(`/order/${id}`, {
      method: "DELETE",
    });
  }

  // adicionar pagamento ao pedido (expect POST /order/:id/payment)
  // payment: { date: string, value: number }  -> value em CENTAVOS
  async addPayment(id: string, payment: PaymentHistory, nameCustomer: string) {
    return this.request<Order>(`/order/${id}/payment`, {
      method: "POST",
      body: JSON.stringify({ ...payment, nameCustomer }),
    });
  }

  // Deletar pagamento de um pedido
  async deletePayment(id: string, paymentId: string) {
    return this.request<Order>(`/order/${id}/payment/${paymentId}`, {
      method: "DELETE",
    });
  }

  // Registro endpoints
  async getRegistrations() {
    return this.request<Registration[]>("/registration/");
  }

  async createRegistration(Registration: Omit<Registration, "_id" | "date">) {
    return this.request<Registration>("/registration/create", {
      method: "POST",
      body: JSON.stringify(Registration),
    });
  }

  async getRegistration(id: string) {
    return this.request<Registration>(`/registration/${id}`);
  }

  async updateRegistration(id: string, Registration: Partial<Registration>) {
    return this.request<Registration>(`/registration/${id}`, {
      method: "PUT",
      body: JSON.stringify(Registration),
    });
  }

  // Financial endpoints
  async getFinancials() {
    return this.request<Financial[]>("/financial/");
  }

  async getFinancial(id: string) {
    return this.request<Financial>(`/financial/${id}`);
  }

  async createFinancial(financial: Omit<Financial, "_id">) {
    return this.request<Financial>("/financial/create", {
      method: "POST",
      body: JSON.stringify(financial),
    });
  }

  async updateFinancial(id: string, financial: Partial<Financial>) {
    return this.request<Financial>(`/financial/${id}`, {
      method: "PUT",
      body: JSON.stringify(financial),
    });
  }

  // utilitário para tentar extrair mensagem amigável do body
  private safeParseTextMessage(text: string) {
    try {
      const j = JSON.parse(text);
      if (j?.error) return j.error;
      if (j?.message) return j.message;
      return text;
    } catch {
      return text;
    }
  }
}

// Tipos TypeScript (mantenha como você já tinha)
export interface PublicClient {
  name: string;
  telephone: string;
}

export interface PublicProduct {
  // _id: string;
  name: string;
}

export interface Client {
  _id: string;
  name: string;
  telephone: string;
  address?: string;
  anniversary?: string;
  cpf?: string;
}

export interface Product {
  _id: string;
  name: string;
  stock: number;
  category: string;
  value: number;
  price: number;
  datePurchase: Date;
  code: string;
}

export interface OrderItem {
  productId: string;
  amount: number;
  unitPrice: number;
}

export interface PaymentHistory {
  date: string;
  value: number;
}

export interface Installment {
  number: number; // 1,2,3...
  dueDate: string; // ISO string (ex: "2025-11-15T00:00:00.000Z")
  amount: number; // em centavos (ou na unidade que o backend espera)
  status?: "pendente" | "pago" | "atrasado";
}

export interface Order {
  _id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  price: number;
  installmentsTotal: number;
  installmentsPaid: number;
  paid?: number;
  date: string;
  paymentHistory: PaymentHistory[];
  parcelas: number;
  parcelasPagas: number;
  installments: Installment[]; // <-- novo campo obrigatório no model
  vendedora: string,
}

export interface Registration {
  _id: string;
  date: string;
  type: "Out" | "In";
  value: number;
  category: string;
  description: string;
  tags: string[];
  createAt: string;
  newBalance: number;
  previousBalance?: number;
  paid?: boolean;
}

export interface Financial {
  _id: string;
  current: number;
  moneyOut: number;
  cashInflow: number;
  pendentIn: number;
}

// exporta uma instância pronta
export const api = new ApiService();

