import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const QueryClientProvider = imp("QueryClientProvider@@tanstack/react-query")
const getQueryClient = imp("getQueryClient@@/lib/query/client")
const TRPCProvider = imp("TRPCProvider@@/lib/trpc/client")
const makeTRPCClient = imp("makeTRPCClient@@/lib/trpc/client")

// Same path and export name as templates/components/providers/query-provider.tsx, so
// app/layout.tsx doesn't care which flavor was generated.
export const writeTrpcQueryProviderComponent = () => code`
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = ${getQueryClient}();
  const [trpcClient] = ${useState}(() => ${makeTRPCClient}());
  return (
    <${QueryClientProvider} client={queryClient}>
      <${TRPCProvider} trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </${TRPCProvider}>
    </${QueryClientProvider}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeTrpcQueryProviderComponent;
