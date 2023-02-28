let { encapsulation } = require("../../../node-ethernet-ip/src/enip");

/**
 * Override sendRRData function with supporting adding extra data
 *
 * @param {number} session - Encapsulation Session ID
 * @param {Buffer} unconnected_data - Unconnected data to be sent in Buffer
 * @param {Array} [extra_data=null] - Extra data to be sent like sockaddr infor
 * @param {number} [timeout=10] Timeout in seconds
 * @returns {Buffer} Return UCMM encapsulated packet
 */
const sendRRData = (
  session,
  unconnected_data,
  extra_data = null,
  timeout = 10
) => {
  const { SendRRData } = encapsulation.commands;

  let interface_timeout_section_buf = Buffer.alloc(6);
  interface_timeout_section_buf.writeUInt32LE(0x00, 0); //Interface handle <UDINT> shall be zero for CIP
  interface_timeout_section_buf.writeUInt16LE(timeout, 4); //Timeout in seconds is not used in reply.

  //Create CPF
  const { CPF, header } = encapsulation;
  let items = [
    { TypeID: CPF.ItemIDs.Null, data: Buffer.from([]) },
    { TypeID: CPF.ItemIDs.UCMM, data: unconnected_data },
  ];

  if (extra_data) items = [...items, ...extra_data];

  let buf = CPF.build(items);

  buf = Buffer.concat([interface_timeout_section_buf, buf]);

  return header.build(SendRRData, session, buf);
};

/**
 * Retrun a Register Session Reply String
 *
 * @param {Buffer|Array} [data=[]] - Received data
 * @returns {string} register session reply string
 */
const registerSessionReply = (session_id, data = Buffer.alloc(4)) => {
  const { RegisterSession } = encapsulation.commands;
  const { build } = encapsulation.header;

  return build(RegisterSession, session_id, data);
};

module.exports = { ...encapsulation, sendRRData, registerSessionReply };
