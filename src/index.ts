import { Command, Option } from "commander"
import AcarajeInit from "./commands/init"
import AcarajeUpdateSchema from "./commands/update-schema"
import { API_LAYERS, ApiLayer } from "./shared/api-layer"

const program = new Command()

program
  .name("acaraje")
  .description("CLI to scaffold a Next.js Acaraje admin panel from a schema")

program
  .command("init")
  .description("Scaffold a Next.js Acaraje admin panel from a schema")
  .addOption(
    new Option("--api <layer>", "API layer the panel's front end uses (skips the prompt)")
      .choices([...API_LAYERS])
  )
  .action(async (opts: { api?: ApiLayer }) => AcarajeInit(opts))

const update = program
  .command("update")
  .description("Update parts of a generated Acaraje admin panel")

update
  .command("schema")
  .description("Re-parse your schema and regenerate schema-dependent code (CRUD routes, seeder, folders)")
  .action(async () => AcarajeUpdateSchema())

program.parse()
