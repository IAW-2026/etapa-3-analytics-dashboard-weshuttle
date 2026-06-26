import { SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center flex flex-col items-center max-w-md w-full">
          <div className="bg-red-500/10 p-3 rounded-full border border-red-500/20 mb-4">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
            Acceso Restringido
          </h1>
          
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            El Analytics Dashboard de WeShuttle está reservado exclusivamente para usuarios con rol global de administrador (<code className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-xs">admin</code>).
          </p>

          <p className="text-xs text-slate-500 leading-relaxed mb-8">
            Si considera que esto es un error o necesita que se le asigne este rol en su cuenta, comuníquese con el administrador del sistema.
          </p>

          <SignOutButton redirectUrl="/sign-in">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-slate-100 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 hover:scale-[1.02] cursor-pointer">
              Cerrar Sesión / Cambiar Cuenta
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
