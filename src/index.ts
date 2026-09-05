import { Command } from "commander"
import AcarajeInit from "./commands/init"
import AcarajeUpdateSchema from "./commands/update-schema"

const program = new Command()

program
  .name("acaraje")
  .description("CLI to scaffold a Next.js Acaraje admin panel from a schema")

program
  .command("init")
  .description("Scaffold a Next.js Acaraje admin panel from a schema")
  .action(async () => AcarajeInit())

const update = program
  .command("update")
  .description("Update parts of a generated Acaraje admin panel")

update
  .command("schema")
  .description("Re-parse your schema and regenerate schema-dependent code (CRUD routes, seeder, folders)")
  .action(async () => AcarajeUpdateSchema())

program.parse()
