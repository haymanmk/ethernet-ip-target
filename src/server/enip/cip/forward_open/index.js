const ConnectionManager = require("../../cip/connetion_manager");
const EPATH = require("../../cip/epath");
const MessageRouter = require("../../cip/message_router");

/**
 * Parse an Forward Open Request
 *
 * @param {Buffer} buf - Forward Open Request Buffer
 * @returns {ForwardOpenRequest} - Decoded Request
 */
const parse = (buf) => {
  let ForwardOpenRequest = {
    priority_time_tick: parsePriorityTimeTick(buf.subarray(0, 1)),
    timeout_ticks: buf.readUInt8(1),
    actual_timeout: null,
    o_t_network_connection_id: buf.readUInt32LE(2),
    t_o_network_connection_id: buf.readUInt32LE(6),
    connection_serial_num: buf.readUInt16LE(10),
    originator_vendor_id: buf.readUInt16LE(12),
    originator_serial_num: buf.readUInt32LE(14),
    connection_timeout_multiplier: buf.readUInt8(18),
    o_t_rpi: buf.readUInt32LE(22),
    o_t_network_connection_params: parseNetworkConnetionParam(
      buf.subarray(26, 28)
    ),
    t_o_rpi: buf.readUInt32LE(28),
    t_o_network_connection_params: parseNetworkConnetionParam(
      buf.subarray(32, 34)
    ),
    transport_type_trigger: parseTransportTypeTrigger(buf.subarray(34, 35)),
    connetion_path_size: buf.readUInt8(35),
    connection_path: [],
  };

  ForwardOpenRequest.actual_timeout = calculateActualTimeout(
    ForwardOpenRequest.priority_time_tick.time_tick,
    ForwardOpenRequest.timeout_ticks
  );

  ForwardOpenRequest.connection_path = [
    ...EPATH.parse(
      buf.subarray(36, buf.length),
      ForwardOpenRequest.connetion_path_size
    ),
  ];

  return ForwardOpenRequest;
};

/**
 * Parse Priority/Time_tick Buffer
 *
 * @param {Buffer} buf - data trimmed from request data from originator
 * @returns {object} parsed result in object
 */
const parsePriorityTimeTick = (buf) => {
  if (!Buffer.isBuffer(buf))
    throw new Error("Data to be parsed shall be in type of Buffer!");

  const result = {
    priority: 0,
    time_tick: buf.readUInt8(0) & 0x0f,
  };

  return result;
};

/**
 *
 * @param {Buffer} buf - data trimmed from requst data from originator
 * @returns {object} parsed result in object
 */
const parseNetworkConnetionParam = (buf) => {
  if (!Buffer.isBuffer(buf))
    throw new Error("Data to be parsed shall be in type of Buffer!");

  const result = {
    redundant_owner: null,
    connection_type: null,
    priority: null,
    fixed_variable: null,
    connection_size: null,
  };

  let buf_uint16 = buf.readUInt16LE(0);

  result.connection_size = buf_uint16 & 0x01ff;
  buf_uint16 >>>= 9;

  result.fixed_variable = buf_uint16 & 0x0001;
  buf_uint16 >>>= 1;

  result.priority = buf_uint16 & 0x0003;
  buf_uint16 >>>= 3;

  result.connection_type = buf_uint16 & 0x0003;
  buf_uint16 >>>= 2;

  result.redundant_owner = buf_uint16;

  return result;
};

/**
 * Parse Transport Type/Trigger
 *
 * @param {Buffer} buf - data trimmed from request data from originator
 * @returns {object} parsed result in object
 */
const parseTransportTypeTrigger = (buf) => {
  if (!Buffer.isBuffer(buf))
    throw new Error("Data to be parsed shall be in type of Buffer!");

  const result = {
    dir: null,
    production_trigger: null,
    transport_class: null,
  };

  let buf_uint8 = buf.readUInt8(0);

  result.transport_class = buf_uint8 & 0x0f;
  buf_uint8 >>>= 4;

  result.production_trigger = buf_uint8 & 0x07;
  buf_uint8 >>>= 3;

  result.dir = buf_uint8;

  return result;
};

/**
 * Calculate Actual Timeout
 *
 * @param {number} time_tick - in integer
 * @param {number} timeout_ticks - in integer
 * @returns {number} return actual timeout in milliseconds.
 */
const calculateActualTimeout = (time_tick, timeout_ticks) => {
  return Math.pow(2, time_tick) * timeout_ticks;
};

/**
 *
 * @param {Buffer} message_request - Request Data from originator in object form which is the result of parser
 * @param {number} general_status - General Status in Integer
 * @param {Array} additional_status - Additional status, also known as extension status code, in integer
 * @param {number} o_t_api - Actual Packet Interval in integer
 * @param {number} t_o_api - Actual Packet Interval in integer
 * @param {Buffer} application_reply_buf - Application specific data in buffer
 *
 * @returns {Buffer} return a Message Router Packet in buffer
 */
const build = (
  message_request,
  general_status = 0x00,
  additional_status = [],
  o_t_api = message_request.o_t_rpi,
  t_o_api = message_request.t_o_rpi,
  application_reply_buf = null
) => {
  const FORWARD_OPEN_SERVICE = ConnectionManager.services.FORWARD_OPEN;

  let application_reply_size;
  if (application_reply_buf)
    application_reply_size = Math.ceil(application_reply_buf.length / 2);
  else application_reply_size = 0;

  const buf = Buffer.alloc(26 + 2 * application_reply_size);

  buf.writeUInt32LE(message_request.o_t_network_connection_id, 0);
  buf.writeUInt32LE(message_request.t_o_network_connection_id, 4);
  buf.writeUInt16LE(message_request.connection_serial_num, 8);
  buf.writeUInt16LE(message_request.originator_vendor_id, 10);
  buf.writeUInt32LE(message_request.originator_serial_num, 12);
  buf.writeUInt32LE(o_t_api, 16);
  buf.writeUInt32LE(t_o_api, 20);
  buf.writeUInt8(application_reply_size, 24);

  if (application_reply_size > 0) {
    application_reply_buf.copy(buf, 26);
  }

  const result = MessageRouter.build(
    FORWARD_OPEN_SERVICE | 0x80,
    general_status,
    additional_status,
    buf
  );

  return result;
};

module.exports = { parse, build };
