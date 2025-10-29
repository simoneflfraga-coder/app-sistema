import BlueHeart from "@/assets/BlueHeart.svg";
import business from "@/assets/businessSoftware.jpg";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (isLoading) return;

    if (!email.trim() || !password.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Por favor informe email e senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // await new Promise((resolve) => setTimeout(resolve, 2000));
      const data = await api.login(email, password);

      if (data.error === `{"error":"Credenciais inválidas"}`) {
        toast({
          title: "Falha ao entrar",
          description: "Email ou senha Inválidos.",
          variant: "destructive",
        });
        return;
      }

      api.setToken(data.data.accessToken);

      toast({
        title: "Login realizado",
        description: `Bem-vindo de volta!`,
        variant: "default",
      });

      navigate("/");
    } catch (err: unknown) {
      console.error("erro login:" + err);

      const message =
        err && typeof err === "object" && "message" in err
          ? // @ts-ignore
            (err as any).message
          : "Erro ao autenticar. Verifique suas credenciais e tente novamente.";

      toast({
        title: "Não foi possível entrar",
        description: message as string,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      <section className="flex h-screen w-full flex-col justify-between bg-[#fdfcff] px-10 py-5 sm:w-6/12 sm:px-5 sm:py-10 md:w-5/12 md:px-5 md:py-5 lg:px-16 lg:py-14">
        <div>
          <img src={BlueHeart} className="w-36 sm:w-44" alt="Logo Sistema" />
        </div>

        <p className="mb-5 mt-10 font-semibold text-gray-700">
          Entre para acessar o Sistema!
        </p>

        {/* <-- Aqui transformamos em form e prevenimos o comportamento padrão */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-8"
        >
          <div className="w-full">
            <label htmlFor="email" className="font-medium text-gray-700">
              Email
            </label>
            <div className="mt-1 flex gap-3 rounded-sm border-[1px] px-4 py-3 focus-within:border-2 focus-within:border-blue-700">
              <UserRound className="h-6 w-6 text-gray-500" />
              <input
                className="w-full bg-inherit outline-none"
                name="email"
                type="email"
                id="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="w-full">
            <label htmlFor="passwrd" className="font-medium text-gray-700">
              Senha
            </label>
            <div className="mt-1 flex gap-3 rounded-sm border-[1px] px-4 py-3 focus-within:border-2 focus-within:border-blue-700">
              <Lock className="h-6 w-6 text-gray-500" />
              <input
                className="w-full bg-inherit outline-none"
                name="passwrd"
                type={showPassword ? "text" : "password"}
                id="passwrd"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              {showPassword ? (
                <Eye
                  onClick={() => setShowPassword(false)}
                  className="h-6 w-6 cursor-pointer text-gray-500"
                />
              ) : (
                <EyeOff
                  onClick={() => setShowPassword(true)}
                  className="h-6 w-6 cursor-pointer text-gray-500"
                />
              )}
            </div>
          </div>

          <Link to="/fds" className="text-end text-sm text-blue-500">
            Esqueci minha senha!
          </Link>

          <hr />

          <div className="flex flex-col gap-3">
            <button
              type="submit" /* <--- aqui */
              disabled={isLoading}
              className={`transition-700 flex items-center justify-center rounded-sm bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-800 ${
                isLoading ? "cursor-not-allowed opacity-80" : ""
              }`}
              aria-live="polite"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center">
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Carregando...</span>
                </span>
              ) : (
                "Entrar"
              )}
            </button>

            <button
              type="button" /* <--- evita submeter o form */
              className="transition-500 rounded-sm py-3 font-semibold text-blue-600 shadow-[0_0_10px_3px_rgba(156,163,175,0.4)] transition-colors hover:bg-gray-200"
            >
              Criar uma conta
            </button>
          </div>
        </form>

        <p className="mx-auto mt-1 text-xs">
          {import.meta.env.VITE_VERSION_APP}
        </p>
        {/* <-- fim do form */}
      </section>

      <section className="hidden h-screen w-6/12 items-center justify-center bg-[#5285F2] sm:flex md:w-7/12">
        <img src={business} className="h-4/5 w-4/5 object-contain" alt="" />
      </section>
    </div>
  );
}

export default Login;
