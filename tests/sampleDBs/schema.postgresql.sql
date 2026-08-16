-- Sample marketplace schema used by tests/sql-parser.test.ts (PostgreSQL dialect).
-- Structurally equivalent to schema.prisma / schema.mysql.sql / schema.sqlite.sql.

CREATE TYPE role AS ENUM ('ADMIN', 'SELLER', 'BUYER');
CREATE TYPE product_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED');

CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" role NOT NULL DEFAULT 'BUYER',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Category" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE "Product" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "status" product_status NOT NULL DEFAULT 'DRAFT',
  "sellerId" INTEGER NOT NULL REFERENCES "User"("id"),
  "categoryId" INTEGER NOT NULL REFERENCES "Category"("id"),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Order" (
  "id" SERIAL PRIMARY KEY,
  "buyerId" INTEGER NOT NULL REFERENCES "User"("id"),
  "status" order_status NOT NULL DEFAULT 'PENDING',
  "total" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrderItem" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "Order"("id"),
  "productId" INTEGER NOT NULL REFERENCES "Product"("id"),
  "quantity" INTEGER NOT NULL,
  "price" DECIMAL(10,2) NOT NULL
);

CREATE TABLE "Review" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL REFERENCES "Product"("id"),
  "authorId" INTEGER NOT NULL REFERENCES "User"("id"),
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("productId", "authorId")
);
