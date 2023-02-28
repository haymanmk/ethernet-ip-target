let logical = {};

logical.types = {
  CLASS_ID: 0x00,
  INSTANCE_ID: 0x01,
  MEMBER_ID: 0x02,
  CONNECTION_POINT: 0x03,
  ATTRIBUTE_ID: 0x04,
  SPECIAL: 0x05,
  SERVICE_ID: 0x06,
};

/**
 *
 * @param {number} segment_format - intake in integer
 * @param {Buffer} buf - intake all the received buffer
 * @param {number} offset - current offset depending on the decoding progess
 * @returns {object} return the result in type of object
 */
logical.parse = (segment_format, buf, offset) => {
  const result = {
    segment_format: logical.parseSegmentFormat(segment_format),
    logical_value: null,
    total_length: null, // total length of EPATH in bytes including logical value
  };
  switch (result.segment_format.logical_format) {
    case 0x00: //8-bit logical address
      result.logical_value = buf.readUInt8(offset + 1);
      result.total_length = 2;
      break;
    case 0x01: //16-bit logical address
      result.logical_value = buf.readUInt16LE(offset + 2);
      result.total_length = 4;
      break;
    case 0x02: //32-bit logical address
      result.logical_value = buf.readUInt32LE(offset + 2);
      result.total_length = 6;
      break;
    default:
      console.log(
        `Cannot decode logical format set in ${result.segment_format.logical_format}`
      );
  }

  // Special logical type (0x05). Its Logical Format only supports 0x00 right now.
  // It means Electronix Key Segment (0x34) which is going to include product's information
  // like vendor ID, devise type, and product code, etc. in the data payload.
  if (buf.readUInt8(offset) === 0x34 && buf.readUInt8(offset + 1) === 4) {
    result.total_length = 16;
    result["electronic_key_segment"] = parseElectronicKey(
      buf.subarray(offset + 2, offset + 10)
    );
  }

  return result;
};

/**
 * Parse Segment Format Bits
 *
 * @param {number} segment_format - 5-bit integer
 * @returns {objectj} parsed result, {logical_type, logical_format}
 */
logical.parseSegmentFormat = (segment_format) => {
  const result = {
    logical_type: null,
    logical_format: null, // 0: 8-bit; 1: 16-bit; 2: 32-bit; 3: reserved
  };

  result.logical_format = segment_format & 0x03;
  segment_format >>>= 2;

  result.logical_type = segment_format;

  if (result.logical_format > 2)
    throw new Error(
      `Do not specify Logical Format as ${result.logical_format} which is reserved for future use.`
    );

  if (
    result.logical_format === 2 &&
    result.logical_type != 1 &&
    result.logical_type != 3
  )
    throw new Error(
      `32-bit logical address is only allowed for Instance ID and Connection Point`
    );

  return result;
};

/**
 * Parse the Electronic Key segment (0x34)
 *
 * @param {Buffer} buf - take the 8 bytes long electronic key data in Buffer form
 * @returns {object} return the product information in object
 */
const parseElectronicKey = (buf) => {
  const result = {
    vendor_id: buf.readUInt16LE(0),
    device_type: buf.readUInt16LE(2),
    product_code: buf.readUInt16LE(4),
    major_revision_compatibility: {
      major_revision: null,
      compatibility: null,
    },
    minor_revision: buf.readUInt8(7),
  };

  // read the buffer related to majopr revision and compatibility in 8-bit usigned int
  let rev_comp_buf_uint8 = buf.readUInt8(6);

  result.major_revision_compatibility.major_revision =
    rev_comp_buf_uint8 & 0x7f;
  rev_comp_buf_uint8 >>>= 7;

  result.major_revision_compatibility.compatibility = rev_comp_buf_uint8;

  return result;
};

module.exports = { logical };
