/**
 * Input Sanitization Utility
 * Blocks XSS, SQL injection, and dangerous patterns from all user inputs.
 */

// Dangerous patterns to strip
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^\s>]+/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*["']?\s*javascript/gi,
];

// SQL injection patterns
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE)\b\s)/gi,
  /(--|;|\/\*|\*\/|xp_|sp_)/g,
  /('\s*(OR|AND)\s*'?\s*\d*\s*=\s*\d*)/gi,
  /('\s*(OR|AND)\s*'[^']*')/gi,
];

/**
 * Sanitize user input by stripping dangerous HTML/JS/SQL patterns.
 * Safe for comments, search queries, profile fields, post content.
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  let cleaned = input;
  
  // Strip HTML tags (keep text content)
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove SQL injection attempts
  for (const pattern of SQL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Encode remaining special chars that could be dangerous
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return cleaned.trim();
};

/**
 * Light sanitization for search queries - preserves readability
 * but blocks injection vectors.
 */
export const sanitizeSearch = (query: string): string => {
  if (!query || typeof query !== 'string') return '';
  
  let cleaned = query;
  
  // Strip HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Remove script/event handlers
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove SQL keywords in injection context
  for (const pattern of SQL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim().slice(0, 200); // Max 200 chars for search
};

/**
 * Sanitize profile fields (username, bio, display name)
 */
export const sanitizeProfileField = (value: string, maxLength = 500): string => {
  if (!value || typeof value !== 'string') return '';
  
  let cleaned = sanitizeInput(value);
  return cleaned.slice(0, maxLength);
};

/**
 * Validate and sanitize URL inputs
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Block dangerous protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
  
  // Only allow http/https
  if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  
  return trimmed;
};
