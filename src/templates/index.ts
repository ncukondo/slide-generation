export type {
  IconsHelper,
  MetaContext,
  RefsHelper,
  SlideContext,
  TemplateContext,
} from "./engine";

export { TemplateEngine } from "./engine";

export type { TemplateDefinition, ValidationResult } from "./loader";
export { TemplateLoader, templateDefSchema } from "./loader";

export type { JsonSchema } from "./validators";
export { jsonSchemaToZod, validateWithJsonSchema } from "./validators";

export { CSSCollector } from "./css-collector";
