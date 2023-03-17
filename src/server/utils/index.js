const {
  promiseTimeout,
  delay,
} = require("../../node-ethernet-ip/src/utilities");
const crypto = require("crypto");

/**
 * Generate a random 4 bytes ID.
 *
 * @returns {number} session_id
 */
const generate32BitID = () => {
  return crypto.randomBytes(4).readUInt32BE(0);
};

/**
 * Convert IP String into Bytes Buffer
 *
 * @param {string} ip - ip address in string
 * @returns {Buffer} return 4 bytes buffer in an order of big-endian
 */
const ip2HexBuffer = (ip) => {
  const ipArr = ip.split(".").map((str) => str - "0");
  return Buffer.from(ipArr);
};

/**
 * Convert IP in 4-byte Buffer into String
 *
 * @param {Buffer} hex_buf - ip address in 4 bytes buffer in an order of big-endian
 * @returns {string} return ip address string
 */
const hexBuffer2IP = (hex_buf) => {
  let ipStr = `${hex_buf[0]}`;
  for (let i = 1; i < 4; i++) {
    ipStr += `.${hex_buf[i]}`;
  }
  return ipStr;
};

module.exports = {
  promiseTimeout,
  delay,
  generate32BitID,
  ip2HexBuffer,
  hexBuffer2IP,
};
