import * as p from "@clack/prompts";
import z from "zod";

// Skip validation entirely on empty/whitespace input — that case
// falls back to the default value after the prompt resolves.
const isBlank = (value: any) => value === undefined || value.trim() === "";

const orDefault = (value: any, fallback: any) =>
  isBlank(value) ? fallback : value.trim();

const prompts = p.group(
  {
    name: () =>
      p.text({
        message: "Panel name",
        placeholder: "Default: Acaraje",
        defaultValue: "Acaraje",
        validate: (value) => {
          if (isBlank(value)) return;
          const result = z
            .string()
            .trim()
            .max(15, "Name cannot exceed 15 characters")
            .safeParse(value);
          if (!result.success) {
            return result.error.issues[0]?.message;
          }
        },
      }),

    orm: () =>
      p.select({
        message: "Select your ORM",
        options: [
          { value: "prisma", label: "Prisma" },
          { value: "pure-sql", label: "No ORM (Pure SQL)" },
        ],
      }),

    prov: ({ results }) => {
      if (results.orm !== "pure-sql") return;
      return p.select({
        message: "Which database provider are you using?",
        options: [
          { value: "postgresql", label: "PostgreSQL" },
          { value: "mysql", label: "MySQL" },
          { value: "sqlite", label: "SQLite" },
        ],
      });
    },

    schemaPath: ({ results }) => {
      const schemaFile = results.prov ? "schema.sql" : "schema.prisma";
      const defaultPath = results.prov ? "/database" : "/prisma";
      return p.text({
        message: `Where is your ${schemaFile} located?`,
        placeholder: "Default: " + defaultPath,
        defaultValue: defaultPath,
        validate: (value) => {
          if (isBlank(value)) return;
          const result = z
            .string()
            .trim()
            .startsWith("/", "Folder name should start with '/'")
            .safeParse(value);
          if (!result.success) {
            return result.error.issues[0]?.message;
          }
        },
      });
    },

    storage: () =>
      p.select({
        message: "Select your storage",
        options: [
          { value: "minio", label: "MinIO (local/AWS-Integration)" },
          { value: "gcs", label: "Google Cloud Storage" },
        ],
      }),

    docker: () =>
      p.select({
        message:
          "Are you going to use Docker locally for your storage or database?",
        options: [
          { value: true, label: "Yes" },
          { value: false, label: "No" },
        ],
      }),

    username: () =>
      p.text({
        message: "Username",
        placeholder: "Default: admin",
        defaultValue: "admin",
        validate: (value) => {
          if (isBlank(value)) return;
          const result = z
            .string()
            .trim()
            .min(5, "Username cannot be less than 5 characters")
            .max(15, "Username cannot exceed 15 characters")
            .safeParse(value);
          if (!result.success) {
            return result.error.issues[0]?.message;
          }
        },
      }),

    password: () =>
      p.text({
        message: "Password",
        placeholder: "Default: password",
        defaultValue: "password",
        validate: (value) => {
          if (isBlank(value)) return;
          const result = z.string().trim().safeParse(value);
          if (!result.success) {
            return result.error.issues[0]?.message;
          }
        },
      }),
  },
  {
    onCancel: () => {
      p.cancel("Setup canceled");
      process.exit(1);
    },
  }
);

const C = async () => {
  p.intro("Create Acaraje Admin Panel");

  let { name, orm, prov, schemaPath, storage, docker, username, password } =
    await prompts;

  name = orDefault(name, "Acaraje");
  schemaPath = orDefault(schemaPath, prov ? "/database" : "/prisma");
  username = orDefault(username, "admin");
  password = orDefault(password, "password");

  //const schema = orm === "prisma" ? await prismaParser(schemaPath) : await sqlParser(schemaPath, orm)
  // await createFolderStructure(schema)
  //
  // await Promise.all([
  // generateCRUDs(schema)
  // generateStorage(storage)
  // generateFEComponents(schema, storage)
  // generatePages(schema, storage)
  // ])
  //
  // writeConfigFiles(docker)
  // installNodeModules()
  // generatePrismaClient()

  p.outro(
    "Acaraje Admin is ready to be used. Read the documentation to see next steps: link"
  );
};

export default C;
