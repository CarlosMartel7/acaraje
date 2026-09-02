import { Command } from "commander"
import AcarajeInit from "./commands/init"

const program = new Command()

program
  .name("acaraje")
  .description("CLI to scaffold a Next.js Acaraje admin panel from a schema")

program
  .command("init")
  .description("Scaffold a Next.js Acaraje admin panel from a schema")
  .action(async () => AcarajeInit())

program.parse()
