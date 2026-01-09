// Icon system exports
export {
  iconSourceTypeSchema,
  iconSourceSchema,
  iconDefaultsSchema,
  iconRegistrySchema,
  type IconSourceType,
  type IconSource,
  type IconDefaults,
  type IconRegistry,
} from "./schema.js";

export {
  IconRegistryLoader,
  type ParsedIconReference,
} from "./registry.js";

export {
  IconResolver,
  type IconOptions,
} from "./resolver.js";

export { IconCache } from "./cache.js";
