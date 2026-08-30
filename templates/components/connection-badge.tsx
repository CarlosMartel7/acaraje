import { code, imp } from "ts-poet";

const useEffect = imp("useEffect@react")
const useState = imp("useState@react")

export const writeConnectionBadgeComponent = () => code`
export function ConnectionBadge() {
  const [provider, setProvider] = ${useState}("postgresql");

  ${useEffect}(() => {
    fetch("/api/schemas")
      .then((r) => r.json())
      .then((d) => {
        if (d.datasource?.provider) setProvider(d.datasource.provider);
      })
      .catch(() => { });
  }, []);

  return <span>CONNECTED · {provider}</span>;
}
`.toString({ prefix: '"use client";' });

export default writeConnectionBadgeComponent;
