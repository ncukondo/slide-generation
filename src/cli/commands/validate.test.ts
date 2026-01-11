import { describe, it, expect } from 'vitest';
import {
  StructuredValidationError,
  formatLlmValidationResult,
  getHintForErrorType,
} from './validate';

describe('StructuredValidationError', () => {
  it('should have required properties', () => {
    const error: StructuredValidationError = {
      slide: 1,
      line: 15,
      template: 'bullet-list',
      field: 'items',
      message: 'Missing required field: items',
      errorType: 'missing_field',
    };

    expect(error.slide).toBe(1);
    expect(error.line).toBe(15);
    expect(error.template).toBe('bullet-list');
    expect(error.field).toBe('items');
    expect(error.message).toBe('Missing required field: items');
    expect(error.errorType).toBe('missing_field');
  });

  it('should allow optional line and field', () => {
    const error: StructuredValidationError = {
      slide: 2,
      template: 'unknown-template',
      message: 'Template not found',
      errorType: 'unknown_template',
    };

    expect(error.line).toBeUndefined();
    expect(error.field).toBeUndefined();
  });
});

describe('formatLlmValidationResult', () => {
  it('should format error with line number and template', () => {
    const errors: StructuredValidationError[] = [
      {
        slide: 2,
        line: 15,
        template: 'bullet-list',
        field: 'items',
        message: 'Missing required field: items',
        errorType: 'missing_field',
      },
    ];

    const result = formatLlmValidationResult(errors, 0);

    expect(result).toContain('Validation failed.');
    expect(result).toContain('Error at line 15, Slide 2 (bullet-list):');
    expect(result).toContain('Missing required field: items');
  });

  it('should format multiple errors with separators', () => {
    const errors: StructuredValidationError[] = [
      {
        slide: 1,
        line: 10,
        template: 'title',
        message: 'Missing required field: title',
        errorType: 'missing_field',
      },
      {
        slide: 3,
        line: 25,
        template: 'bullet-list',
        message: 'Invalid type for items',
        errorType: 'invalid_type',
      },
    ];

    const result = formatLlmValidationResult(errors, 0);

    expect(result).toContain('Error at line 10, Slide 1 (title):');
    expect(result).toContain('Error at line 25, Slide 3 (bullet-list):');
    expect(result).toContain('---');
  });

  it('should show success message for valid result', () => {
    const result = formatLlmValidationResult([], 5);

    expect(result).toContain('Validation passed.');
    expect(result).toContain('5 slides validated.');
  });

  it('should include fix example for missing_field error', () => {
    const errors: StructuredValidationError[] = [
      {
        slide: 2,
        line: 15,
        template: 'bullet-list',
        field: 'items',
        message: 'Missing required field: items',
        errorType: 'missing_field',
        fixExample: `content:
  title: "Your title"
  items:
    - "Item 1"
    - "Item 2"`,
      },
    ];

    const result = formatLlmValidationResult(errors, 0);

    expect(result).toContain('Fix:');
    expect(result).toContain('items:');
  });

  it('should include hint for unknown_template error', () => {
    const errors: StructuredValidationError[] = [
      {
        slide: 1,
        line: 5,
        template: 'unknown-template',
        message: 'Template "unknown-template" not found',
        errorType: 'unknown_template',
      },
    ];

    const result = formatLlmValidationResult(errors, 0);

    expect(result).toContain('Hint:');
    expect(result).toContain('slide-gen templates list');
  });

  it('should include hint for unknown_icon error', () => {
    const errors: StructuredValidationError[] = [
      {
        slide: 2,
        line: 20,
        template: 'bullet-list',
        message: 'Unknown icon "unknown-icon"',
        errorType: 'unknown_icon',
      },
    ];

    const result = formatLlmValidationResult(errors, 0);

    expect(result).toContain('Hint:');
    expect(result).toContain('slide-gen icons search');
  });

  it('should handle error without line number', () => {
    const errors: StructuredValidationError[] = [
      {
        slide: 1,
        template: 'title',
        message: 'Schema validation failed',
        errorType: 'schema_error',
      },
    ];

    const result = formatLlmValidationResult(errors, 0);

    expect(result).toContain('Error at Slide 1 (title):');
    expect(result).not.toContain('line');
  });
});

describe('getHintForErrorType', () => {
  it('should return hint for unknown_template', () => {
    const hint = getHintForErrorType('unknown_template');

    expect(hint).toContain('slide-gen templates list');
  });

  it('should return hint for unknown_icon', () => {
    const hint = getHintForErrorType('unknown_icon');

    expect(hint).toContain('slide-gen icons search');
  });

  it('should return null for other error types', () => {
    expect(getHintForErrorType('missing_field')).toBeNull();
    expect(getHintForErrorType('invalid_type')).toBeNull();
    expect(getHintForErrorType('schema_error')).toBeNull();
  });
});
