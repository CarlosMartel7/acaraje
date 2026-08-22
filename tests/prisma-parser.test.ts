import path from "path";

import { prismaParser } from "../src/steps/prisma-parser";
import { writeLog } from "./logger";

const SCHEMA_PATH = path.join(__dirname, "sampleDBs", "schema.prisma");

const result = prismaParser(SCHEMA_PATH);
writeLog("prisma-parser", result);

test("parses the datasource and generator", () => {
  expect(result.datasource?.provider).toBe("postgresql");
  expect(result.generator?.provider).toBe("prisma-client-js");
});

test("parses every marketplace model", () => {
  const names = result.models.map((m) => m.name).sort();
  expect(names).toEqual(["Category", "Order", "OrderItem", "Product", "Review", "User"]);
});

test("parses enums with their values", () => {
  const role = result.enums.find((e) => e.name === "Role");
  const productStatus = result.enums.find((e) => e.name === "ProductStatus");
  const orderStatus = result.enums.find((e) => e.name === "OrderStatus");

  expect(role?.values).toEqual(["ADMIN", "SELLER", "BUYER"]);
  expect(productStatus?.values).toEqual(["DRAFT", "PUBLISHED", "ARCHIVED"]);
  expect(orderStatus?.values).toEqual(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELED"]);
});

test("marks a model's own field as an enum-typed scalar, not a relation", () => {
  const user = result.models.find((m) => m.name === "User")!;
  const role = user.fields.find((f) => f.name === "role")!;

  expect(role.type).toBe("Role");
  expect(role.isRelation).toBe(false);
});

test("distinguishes the scalar FK field from the virtual relation field on Product", () => {
  const product = result.models.find((m) => m.name === "Product")!;

  const sellerId = product.fields.find((f) => f.name === "sellerId")!;
  expect(sellerId.isRelation).toBe(false);
  expect(sellerId.type).toBe("String");

  const seller = product.fields.find((f) => f.name === "seller")!;
  expect(seller.isRelation).toBe(true);
  expect(seller.relationFields).toEqual(["sellerId"]);
  expect(seller.type).toBe("User");
});

test("carries the native db type as an attribute on money fields", () => {
  const product = result.models.find((m) => m.name === "Product")!;
  const price = product.fields.find((f) => f.name === "price")!;

  expect(price.attributes.some((a) => a.startsWith("@db.Decimal"))).toBe(true);
});

test("Review.comment is optional", () => {
  const review = result.models.find((m) => m.name === "Review")!;
  const comment = review.fields.find((f) => f.name === "comment")!;

  expect(comment.isRequired).toBe(false);
});

test("captures the composite @@unique on Review as a raw index", () => {
  const review = result.models.find((m) => m.name === "Review")!;

  expect(review.indexes.some((idx) => idx.includes("@@unique") && idx.includes("productId"))).toBe(
    true,
  );
});

test("infers a relation between Product and its seller", () => {
  const relation = result.relations.find((r) => r.from === "Product" && r.fromField === "seller");

  expect(relation).toBeDefined();
  expect(relation?.to).toBe("User");
});
