import { code, imp } from "ts-poet";

const Metadata = imp("t:Metadata@next")
const DM_Mono = imp("DM_Mono@next/font/google")
const Inter = imp("Inter@next/font/google")
const Toaster = imp("Toaster@@/components/ui/sonner")
const QueryProvider = imp("QueryProvider@@/components/providers/query-provider")
const cn = imp("cn@@/lib/utils")

export const writeRootLayout = () => code`
import "./globals.css";

const inter = ${Inter}({ subsets: ["latin"], variable: "--font-sans" });

const mono = ${DM_Mono}({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: ${Metadata} = {
  title: "Acaraje Admin",
  description: "Simple and quick admin panel for Prisma apps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.log("test");

  return (
    <html lang= "en" className = { ${cn}("dark", "font-sans", inter.variable) } >
      <body className={ \`\${inter.variable} \${mono.variable} font-sans antialiased\` }>
        <${QueryProvider}>
        <${Toaster} />
  { children }
  </${QueryProvider}>
    </body>
    </html>
  );
}
`;

export default writeRootLayout;
