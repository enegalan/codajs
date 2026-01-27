import {
  validateScriptExecution,
  validateFileContent,
  sanitizeFileName,
  ValidationError,
} from '../validation';

describe('validateScriptExecution', () => {
  it('should validate valid script and options', () => {
    const result = validateScriptExecution('console.log("hello")', {
      runtime: 'node',
      timeout: 5000,
    });

    expect(result.script).toBe('console.log("hello")');
    expect(result.options.runtime).toBe('node');
    expect(result.options.timeout).toBe(5000);
  });

  it('should throw error for non-string script', () => {
    expect(() => validateScriptExecution(123, {})).toThrow(ValidationError);
    expect(() => validateScriptExecution(null, {})).toThrow('Script must be a string');
  });

  it('should throw error for empty script', () => {
    expect(() => validateScriptExecution('', {})).toThrow('Script cannot be empty');
  });

  it('should use default runtime when not specified', () => {
    const result = validateScriptExecution('test', {});
    expect(result.options.runtime).toBe('node');
  });

  it('should throw error for invalid runtime', () => {
    expect(() => validateScriptExecution('test', { runtime: 'invalid' })).toThrow(
      'Invalid runtime'
    );
  });

  it('should accept valid runtimes', () => {
    expect(validateScriptExecution('test', { runtime: 'node' }).options.runtime).toBe('node');
    expect(validateScriptExecution('test', { runtime: 'deno' }).options.runtime).toBe('deno');
    expect(validateScriptExecution('test', { runtime: 'bun' }).options.runtime).toBe('bun');
  });

  it('should use default timeout when not specified', () => {
    const result = validateScriptExecution('test', {});
    expect(result.options.timeout).toBe(5000);
  });

  it('should throw error for invalid timeout', () => {
    expect(() => validateScriptExecution('test', { timeout: 50 })).toThrow(
      'Timeout must be between 100ms and 300000ms'
    );
    expect(() => validateScriptExecution('test', { timeout: 500000 })).toThrow(
      'Timeout must be between 100ms and 300000ms'
    );
  });
});

describe('validateFileContent', () => {
  it('should validate valid file content', () => {
    const result = validateFileContent('file content');
    expect(result).toBe('file content');
  });

  it('should throw error for non-string content', () => {
    expect(() => validateFileContent(123)).toThrow('File content must be a string');
    expect(() => validateFileContent(null)).toThrow('File content must be a string');
  });
});

describe('sanitizeFileName', () => {
  it('should sanitize valid filename', () => {
    expect(sanitizeFileName('my-file')).toBe('my-file');
    expect(sanitizeFileName('my_file')).toBe('my_file');
  });

  it('should replace invalid characters', () => {
    expect(sanitizeFileName('my file.js')).toBe('my_file_js');
    expect(sanitizeFileName('test@#$%')).toBe('test____');
  });

  it('should return untitled for non-string input', () => {
    expect(sanitizeFileName(123)).toBe('untitled');
    expect(sanitizeFileName(null)).toBe('untitled');
  });

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(100);
    expect(sanitizeFileName(longName).length).toBe(50);
  });
});
