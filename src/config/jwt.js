module.exports = {
  secret: process.env.JWT_SECRET || 'mentiscore_secret',
  expiresIn: '1d'
};
