import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";

import Layout from "@/components/Layout";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import CustomerCreate from "@/pages/customers/CustomerCreate";
import CustomerEdit from "@/pages/customers/CustomerEdit";
import CustomerList from "@/pages/customers/CustomerList";

import OrderCreate from "@/pages/orders/OrderCreate";
import OrdersEdit from "@/pages/orders/OrderEdit";
import OrderList from "@/pages/orders/OrderList";

import ProductCreate from "@/pages/products/ProductCreate";
import ProductEdit from "@/pages/products/ProductEdit";
import ProductList from "@/pages/products/ProductList";

import RegistrationCreate from "@/pages/registration/RegistrationCreate";
import RegistrationEdit from "@/pages/registration/RegistrationEdit";
import RegistrationList from "@/pages/registration/RegistrationList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />

            <Route path="clients" element={<CustomerList />} />
            <Route path="clients/new" element={<CustomerCreate />} />
            <Route path="clients/:id/edit" element={<CustomerEdit />} />

            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductCreate />} />
            <Route path="products/:id/edit" element={<ProductEdit />} />

            <Route path="orders" element={<OrderList />} />
            <Route path="orders/new" element={<OrderCreate />} />
            <Route path="orders/:id/edit" element={<OrdersEdit />} />

            <Route path="registrations" element={<RegistrationList />} />
            <Route path="registrations/new" element={<RegistrationCreate />} />
            <Route
              path="registrations/:id/edit"
              element={<RegistrationEdit />}
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
