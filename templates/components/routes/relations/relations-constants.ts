import { code } from "ts-poet";

export const writeRelationsConstants = () => code`
export const RELATION_TYPES = ["one-to-many", "one-to-one", "many-to-one", "many-to-many"] as const;

export const RELATION_LABELS = {
  "one-to-one": "1:1",
  "one-to-many": "1:N",
  "many-to-one": "N:1",
  "many-to-many": "N:M",
} as const;

/** Tinted tag per relation type: orange 1:N, blue 1:1, green N:1, yellow N:M. */
export const RELATION_COLORS = {
  "one-to-one": "bg-info/15 text-info",
  "one-to-many": "bg-primary/15 text-primary",
  "many-to-one": "bg-success/15 text-success",
  "many-to-many": "bg-warning/15 text-warning",
} as const;
`;

export default writeRelationsConstants;
