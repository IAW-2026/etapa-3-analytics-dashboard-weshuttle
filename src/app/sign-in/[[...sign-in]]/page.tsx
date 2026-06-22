import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            WeShuttle
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Analytics Dashboard — Panel de Administrador
          </p>
        </div>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#2563eb", // blue-600
              colorBackground: "#0f172a", // slate-900
              colorForeground: "#f1f5f9", // slate-100
              colorInput: "#1e293b", // slate-800
              colorInputForeground: "#f1f5f9",
              colorMutedForeground: "#94a3b8", // slate-400
            },
            elements: {
              card: "border border-slate-800 shadow-2xl rounded-xl",
              headerTitle: "text-slate-100",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors duration-200",
              footerActionLink: "text-blue-500 hover:text-blue-400",
            },
          }}
        />
      </div>
    </div>
  );
}
