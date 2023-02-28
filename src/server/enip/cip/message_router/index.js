const { MessageRouter } = require("../../../../node-ethernet-ip/src/enip/cip");
const EPATH = require("../../cip/epath");

const services = {
  ...MessageRouter.services,
};

/**
 * Build the Message Router Response in Buffer
 *
 * @param {number} service - service ID
 * @param {number} general_status - general status code in 8-bit number
 * @param {Array} additional_status - additional status in an array of 16-bit numbers
 * @param {Buffer} data - response data in Buffer
 * @returns {Buffer} return the result in Buffer
 */
const build = (
  service,
  general_status = 0x00,
  additional_status = [],
  data
) => {
  const size_additional_status = additional_status.length;
  const dataBuf = Buffer.from(data);
  console.log(data);
  const buf = Buffer.alloc(4 + 2 * size_additional_status + dataBuf.length);

  buf.writeUInt8(service, 0);
  buf.writeUInt8(general_status, 2);
  buf.writeUInt8(size_additional_status, 3);

  if (size_additional_status > 0) {
    const _buf = _UInt16Array2Buffer(additional_status);
    _buf.copy(buf, 4);
  }

  dataBuf.copy(buf, 4 + 2 * size_additional_status);

  return buf;
};

/**
 * Convert Array of 16-bit Numbers into Buffer
 *
 * @param {Array} array - an array of 16-bit numbers
 * @returns {Buffer} return result in Buffer
 */
const _UInt16Array2Buffer = (array) => {
  const arrayLen = array.length;
  if (arrayLen <= 0) return null;

  const buf = Buffer.alloc(arrayLen * 2);
  for (let i = 0; i < arrayLen; i++) {
    buf.writeUInt16LE(array[i], i * 2);
  }

  return buf;
};

/**
 * Parse Message Router Request from Originator
 *
 * @param {Buffer} buf - intake data in Buffer
 * @returns {object} return result in object
 */
const parse = (buf) => {
  const result = {
    service: buf.readUInt8(0),
    request_path_size: buf.readUInt8(1),
    request_path: null,
    request_data: null,
  };

  result.request_path = EPATH.parse(
    buf.subarray(2, 2 + 2 * result.request_path_size),
    result.request_path_size
  );
  result.request_data = buf.subarray(
    2 + 2 * result.request_path_size,
    buf.length
  );

  return result;
};

module.exports = { services, build, parse };
