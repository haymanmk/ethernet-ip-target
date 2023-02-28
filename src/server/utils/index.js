const {
  promiseTimeout,
  delay,
} = require("../../node-ethernet-ip/src/utilities");
const crypto = require("crypto");

/**
 * Generate a random 4 bytes session ID.
 *
 * @returns {number} session_id
 */
const generateSessionID = () => {
  return crypto.randomBytes(4).readUInt32BE(0);
};

module.exports = { promiseTimeout, delay, generateSessionID };
