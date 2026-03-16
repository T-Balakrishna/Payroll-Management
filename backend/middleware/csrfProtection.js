import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATH_PREFIXES = ['/api/auth'];

const generateToken = () => crypto.randomBytes(32).toString('hex');
const resolveCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  };
};


export const csrfProtection = (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  const requestPath = String(req.path || '');
  if (CSRF_EXEMPT_PATH_PREFIXES.some((prefix) => requestPath.startsWith(prefix))) {
    return next();
  }
  let csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!csrfCookie) {
    csrfCookie = generateToken();
    res.cookie(CSRF_COOKIE_NAME, csrfCookie, resolveCookieOptions());
  }

  if (SAFE_METHODS.has(method)) {
    return next();
  }

  const headerToken = req.get(CSRF_HEADER_NAME) || req.get('X-CSRF-Token');
  if (!headerToken || headerToken !== csrfCookie) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
};

export const csrfTokenHandler = (req, res) => {
  let csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfCookie) {
    csrfCookie = generateToken();
    res.cookie(CSRF_COOKIE_NAME, csrfCookie, resolveCookieOptions());
  }
  res.json({ csrfToken: csrfCookie });
};
