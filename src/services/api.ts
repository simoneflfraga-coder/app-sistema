// Configuração centralizada da API
const API_BASE_URL = "https://api-simone.vercel.app";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private baseURL = API_BASE_URL;

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error("API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
}

// Tipos TypeScript
export interface Client {
  _id: string;
  name: string;
  telephone: string;
  address: string;
  anniversary: string;
  cpf: string;
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

export interface Order {
  _id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  price: number;
  installmentsTotal: number;
  installmentsPaid: number;
  paid: boolean;
  date: string;
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
  // paid: boolean;
}

export interface Financial {
  _id: string;
  current: number;
  moneyOut: number;
  cashInflow: number;
  pendentIn: number;
}

export const api = new ApiService();
