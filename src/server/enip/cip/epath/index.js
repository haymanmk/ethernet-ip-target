const SEGMENT = require("./segment");
const { logical } = require("../epath/segment/logical");

const segmentTypes = {
  PORT: 0x00,
  LOGICAL: 0x01,
  DATA: 0x04,
};

/**
 * Parse Connection Path
 *
 * @param {Buffer} buf - take the buffer related to connection path
 * @param {number} epath_size - number of 16-bit words in Request_Path field
 * @returns {Array} return the EPATH array
 */
const parse = (buf, epath_size) => {
  let offset = 0;

  const epath_size_in_8bit = epath_size * 2;
  const epath = [];
  while (offset < epath_size_in_8bit) {
    const segment = parseSegment(buf.readUInt8(offset));

    let _epath = { segment_type: segment.segment_type };
    switch (segment.segment_type) {
      case segmentTypes.LOGICAL:
        let _result = logical.parse(segment.segment_format, buf, offset);
        _epath = {
          ..._epath,
          ..._result,
        };
        offset += _epath.total_length;
        break;
      default:
        console.log(
          `Segment Type: ${segment.segment_type} is not yet supported.`
        );
    }
    epath_size--;
    epath.push(_epath);
  }

  return epath;
};

/**
 * Parse Segment into Segment Type and Segment Format
 *
 * @param {number} segment - segment in 8-bit integer
 * @returns {object} {segment_type, segment_format}
 */
const parseSegment = (segment) => {
  const result = {
    segment_type: null,
    segment_format: null,
  };

  result.segment_format = segment & 0x1f;
  segment >>>= 5;

  result.segment_type = segment;

  return result;
};

module.exports = { segmentTypes, parse, SEGMENT };
