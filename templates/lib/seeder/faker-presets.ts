import { code } from "ts-poet";

export const writeFakerPresets = () => code`
/** Client-safe list of faker paths for the seeder config UI. */
export const FAKER_PRESETS: { path: string; label: string }[] = [
  { path: "internet.email", label: "Email" },
  { path: "person.fullName", label: "Full name" },
  { path: "company.name", label: "Company name" },
  { path: "commerce.productName", label: "Product name" },
  { path: "commerce.price", label: "Price" },
  { path: "lorem.sentence", label: "Sentence" },
  { path: "lorem.words", label: "Words" },
  { path: "lorem.paragraph", label: "Paragraph" },
  { path: "phone.number", label: "Phone" },
  { path: "internet.password", label: "Password" },
  { path: "internet.url", label: "URL" },
  { path: "image.url", label: "Image URL" },
  { path: "location.city", label: "City" },
  { path: "location.country", label: "Country" },
  { path: "location.streetAddress", label: "Street address" },
  { path: "location.zipCode", label: "Zip code" },
  { path: "string.alphanumeric", label: "Alphanumeric string" },
  { path: "string.uuid", label: "UUID" },
  { path: "date.past", label: "Past date" },
  { path: "date.recent", label: "Recent date" },
  { path: "date.future", label: "Future date" },
  { path: "datatype.boolean", label: "Boolean" },
];
`;

export default writeFakerPresets;
