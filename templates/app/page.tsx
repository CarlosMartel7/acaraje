import { code, imp } from "ts-poet";

const redirect = imp("redirect@next/navigation")

export const writeRootPage = () => code`
export default function RootPage() {
  ${redirect}("/acaraje/dashboard");
}
`;

export default writeRootPage;
