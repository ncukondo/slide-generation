export { CitationExtractor, type ExtractedCitation } from './extractor';
export {
  ReferenceManager,
  ReferenceManagerError,
  type CSLItem,
  type CSLAuthor,
} from './manager';
export { CitationFormatter, type FormatterConfig } from './formatter';
export {
  ReferenceValidator,
  type ValidationResult,
  type DetailedValidationResult,
  type MissingCitation,
  type CitationLocation,
} from './validator';
export {
  BibliographyGenerator,
  type BibliographyOptions,
  type BibliographyResult,
} from './bibliography';
export {
  JAPANESE_PATTERN,
  isJapaneseAuthors,
  getYear,
  getIdentifier,
  getFirstAuthorFamily,
  formatAuthorsFull,
  formatFullEntry,
} from './utils';
