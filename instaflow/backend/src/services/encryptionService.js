const crypto = require('crypto');
const config = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended IV length for GCM

function getKeyBuffer() {
  const key = config.encryptionKey;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is required.');
  }
  // Backward compatibility for valid 64-char hex keys
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  // Support any string (e.g. Render generated alphanumeric secrets) safely by hashing it
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypts a plaintext string (e.g. a long-lived IG access token).
 * Returns a single string: iv:authTag:ciphertext (all hex-encoded) so it can
 * be stored as one field in the database.
 */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypts a string produced by `encrypt`.
 */
function decrypt(payload) {
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Malformed encrypted payload');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
