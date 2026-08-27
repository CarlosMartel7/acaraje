import { code, imp } from "ts-poet";

const QueryClient = imp("QueryClient@@tanstack/react-query")
const isServer = imp("isServer@@tanstack/react-query")

export const writeQueryClient = () => code`
function makeQueryClient() {
  return new ${QueryClient}({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
  });
}

let browserQueryClient: ${QueryClient} | undefined;

/** Server: always a fresh client (no cross-request sharing). Browser: one client reused across renders. */
export function getQueryClient() {
  if (${isServer}) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
`;

export default writeQueryClient;
