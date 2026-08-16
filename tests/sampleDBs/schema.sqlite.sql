-- Sample marketplace schema used by tests/sql-parser.test.ts (SQLite dialect).
-- Structurally equivalent to schema.prisma / schema.postgresql.sql / schema.mysql.sql.
-- SQLite has no ENUM type and no CREATE TYPE, so constrained-choice fields are
-- documented with a trailing `-- @enum A | B | C` comment instead (same pseudo-enum
-- convention as src/lib/prisma-parser.ts uses for SQLite Prisma schemas).

CREATE TABLE "User" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'BUYER', -- @enum ADMIN | SELLER | BUYER
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Category" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE "Product" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "price" DECIMAL NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', -- @enum DRAFT | PUBLISHED | ARCHIVED
  "sellerId" INTEGER NOT NULL REFERENCES "User"("id"),
  "categoryId" INTEGER NOT NULL REFERENCES "Category"("id"),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Order" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "buyerId" INTEGER NOT NULL REFERENCES "User"("id"),
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- @enum PENDING | PAID | SHIPPED | DELIVERED | CANCELED
  "total" DECIMAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrderItem" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL REFERENCES "Order"("id"),
  "productId" INTEGER NOT NULL REFERENCES "Product"("id"),
  "quantity" INTEGER NOT NULL,
  "price" DECIMAL NOT NULL
);

CREATE TABLE "Review" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "productId" INTEGER NOT NULL REFERENCES "Product"("id"),
  "authorId" INTEGER NOT NULL REFERENCES "User"("id"),
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("productId", "authorId")
);
