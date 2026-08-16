import { Command } from "commander"
import AcarajeInit from "./commands/init"

const program = new Command()

program
  .name("init")
  .description("Scaffold a Next.js Acaraje admin oabek from a schema")
  .action(async () => AcarajeInit())

program.parse()
