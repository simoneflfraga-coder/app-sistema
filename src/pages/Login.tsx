import business from "@/assets/businessSoftware.jpg";
import LogoFlexLg from "@/assets/Logo-Flex-lg.png";
import { Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

function Login() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex h-screen w-full">
      <section className="flex h-screen w-6/12 flex-col justify-between bg-[#fdfcff] px-16 py-14">
        <div>
          {/* <p>LOGO AQUI</p> */}
          <img src={LogoFlexLg} className="w-44" alt="Logo Sistema" />
        </div>

        <p className="mb-5 mt-10 font-semibold text-gray-700">
          Entre para acessar o Sistema!
        </p>

        <div className="flex flex-col gap-8">
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
              />
              {showPassword ? (
                <Eye
                  onClick={() => {
                    setShowPassword(false);
                  }}
                  className="h-6 w-6 cursor-pointer text-gray-500"
                />
              ) : (
                <EyeOff
                  onClick={() => {
                    setShowPassword(true);
                  }}
                  className="h-6 w-6 cursor-pointer text-gray-500"
                />
              )}
            </div>
          </div>
        </div>

        <Link to="/fds" className="text-end text-sm text-blue-500">
          Esqueci minha senha!
        </Link>

        <hr />
        <div className="flex flex-col gap-4">
          <button className="transition-700 rounded-sm bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-800">
            Entrar
          </button>

          <button className="transition-500 rounded-sm py-3 font-semibold text-blue-600 shadow-[0_0_10px_3px_rgba(156,163,175,0.4)] transition-colors hover:bg-gray-200">
            Criar uma conta
          </button>
        </div>
      </section>
      <section className="flex h-screen w-8/12 items-center justify-center bg-[#5285F2]">
        <img src={business} className="h-4/5 w-4/5" alt="" />
      </section>
    </div>
  );
}

export default Login;
