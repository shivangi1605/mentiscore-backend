const REDACT_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'auth_token',
  'refresh_token',
]);

const sanitize = (value) => {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  return Object.entries(value).reduce((acc, [key, val]) => {
    acc[key] = REDACT_KEYS.has(key) ? '***' : sanitize(val);
    return acc;
  }, {});
};

const toLogString = (value) => {
  if (value == null) return 'null';
  try {
    const str = JSON.stringify(value);
    return str.length > 1000 ? `${str.slice(0, 1000)}...` : str;
  } catch {
    return String(value);
  }
};

module.exports = (req, res, next) => {
  const start = Date.now();

  const safeBody = sanitize(req.body);
  const safeParams = sanitize(req.params);
  const safeQuery = sanitize(req.query);

  console.info(
    `[API][req] ${req.method} ${req.originalUrl} params=${toLogString(safeParams)} query=${toLogString(
      safeQuery
    )} body=${toLogString(safeBody)}`
  );

  const wrap = (fnName) => {
    const original = res[fnName]?.bind(res);
    if (!original) return;
    res[fnName] = (payload) => {
      res.__lastPayload = payload;
      return original(payload);
    };
  };

  wrap('json');
  wrap('send');

  res.on('finish', () => {
    const duration = Date.now() - start;
    const safePayload = sanitize(res.__lastPayload);
    console.info(
      `[API][res] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms payload=${toLogString(safePayload)}`
    );
  });

  next();
};
