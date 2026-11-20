import { Logo } from "@/components/marca/Logo";

/** O que aparece no primeiro instante, antes de os dados locais carregarem. */
export function EsqueletoPainel() {
  return (
    <div className="min-h-dvh lg:pl-64" aria-busy="true" aria-label="Carregando o painel">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-noite-1 lg:block">
        <div className="flex h-16 items-center px-5">
          <Logo claro />
        </div>
        <div className="space-y-2 px-3 py-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-10 rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      </aside>
      <div className="h-16 border-b border-black/[0.06]" />
      <div className="mx-auto max-w-[84rem] animate-pulse px-4 py-8 sm:px-8">
        <div className="h-9 w-56 rounded-xl bg-black/[0.06]" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-32 rounded-cartao bg-white" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-72 rounded-cartao bg-white lg:col-span-2" />
          <div className="h-72 rounded-cartao bg-white" />
        </div>
      </div>
    </div>
  );
}
