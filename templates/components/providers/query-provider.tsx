import { code, imp } from "ts-poet";

const QueryClientProvider = imp("QueryClientProvider@@tanstack/react-query")
const getQueryClient = imp("getQueryClient@@/lib/query/client")

export const writeQueryProviderComponent = () => code`
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = ${getQueryClient}();
  return <${QueryClientProvider} client={queryClient}>{children}</${QueryClientProvider}>;
}
`.toString({ prefix: '"use client";' });

export default writeQueryProviderComponent;
