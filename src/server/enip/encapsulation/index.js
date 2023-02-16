const { encapsulation } = require("../../../node-ethernet-ip/src/enip");
const ecapsulation = require("../../../node-ethernet-ip/src/enip/encapsulation");

const { commands, header } = encapsulation;
/**
 * Retrun a Register Session Reply String
 *
 * @param {Buffer|Array} [data=[]] - Received data
 * @returns {string} register session reply string
 */
const registerSessionReply = (session_id, data = Buffer.alloc(4)) => {
  const { RegisterSession } = commands;
  const { build } = header;

  return build(RegisterSession, session_id, data);
};
