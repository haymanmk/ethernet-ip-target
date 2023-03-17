let { encapsulation } = require("../../../node-ethernet-ip/src/enip");

let { CPF } = encapsulation;

/**
 * Parse Sockadd Info Item
 *
 * @param {Buffer} data - Data portion of Sockaddr(Type ID: 0x8000 O=>T, 0x8001 T=>O) in Buffer
 * @returns {object} return parsed result in object form
 */
CPF["parseSockaddr"] = (data) => {
  const { hexBuffer2IP } = require("../../utils");
  return {
    sin_family: data.readInt16BE(0),
    sin_port: data.readUInt16BE(2),
    sin_addr: hexBuffer2IP(data.subarray(4, 8)),
    sin_zero: data.subarray(8),
  };
};

CPF["buildSockaddr"] = (sockaddr_obj, sockaddr_item_id) => {
  let buf = Buffer.alloc(8);

  const { ip2HexBuffer } = require("../../utils");
  const sin_addr_buf = ip2HexBuffer(sockaddr_obj.sin_addr);

  try {
    buf.writeInt16BE(2, 0); //sin_family AF_INET=2
    buf.writeUInt16BE(sockaddr_obj.sin_port, 2); //sin_port
    sin_addr_buf.copy(buf, 4); //sin_addr
    buf = Buffer.concat([buf, sockaddr_obj.sin_zero]);
  } catch (exc) {
    throw new Error(`[Exception] Durring building sockaddr info: ${exc}`);
  }

  return { TypeID: sockaddr_item_id, data: buf };
};

/**
 * Override sendRRData function with supporting adding extra data
 *
 * @override
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

let UDPDatagram = {};

UDPDatagram.realTimeFormats = {
  MODELESS: 0x01,
  ZERO_LENGTH: 0x02,
  HEARTBEAT: 0x03,
  HEADER_32BIT: 0x04,
};

/**
 * Build Datagram Message
 *
 * @param {number} connection_id - Connection ID specified during connection building
 * @param {number} sequence_num - Sequence Number encoded in the address data field
 * @param {Buffer} data - Data tending to be encoded in datagram in Buffer type
 * @param {number} [class_num=0] - Specify 0/1 for class0/1 transport type
 * @param {number} [sequence_count=null] - Specify sequence count prepended to application data
 * @returns {Buffer} return result in Buffer
 */
UDPDatagram.build = (
  connection_id,
  sequence_num,
  data,
  class_num = 0,
  sequence_count = null
) => {
  //build address data - Connection IO <UDINT>, Sequence Number <UDINT>
  const addressDataBuf = Buffer.alloc(8);
  addressDataBuf.writeUInt32LE(connection_id);
  addressDataBuf.writeUInt32LE(sequence_num, 4);

  let dataBuf;
  if (class_num) {
    //class 1
    //build data packet with a prepended 16-bit sequence count
    const prependSequenceCount = Buffer.alloc(2);
    prependSequenceCount.writeUInt16LE(sequence_count);
    dataBuf = Buffer.concat([prependSequenceCount, data]);
  }

  const { CPF } = encapsulation;
  return CPF.build([
    { TypeID: CPF.ItemIDs.SequencedAddrItem, data: addressDataBuf },
    { TypeID: CPF.ItemIDs.ConnectedTransportPacket, data: dataBuf },
  ]);
};

/**
 * Parse Datagram Message
 *
 * @param {Buffer} data - intake received data which is in Buffer form
 * @param {number} [class_num=0] - Specify 0/1 for class 0/1 transport type
 * @param {number} [realtime_format=0x01] - Specify Real Time Format in a number which can be selected at UDPDatagram.realTimeFormats
 * @returns {objectj} return parsed result in Object
 */
UDPDatagram.parse = (
  data,
  class_num = 0,
  realtime_format = UDPDatagram.realTimeFormats.MODELESS
) => {
  const { CPF } = encapsulation;

  const result = {
    run_idle: null,
    sequence_count: null,
    data: null,
    header_32bit: null,
    connection_id: null,
    sequence_number: null,
  };

  const dataArray = CPF.parse(data);

  if (dataArray[0].TypeID === CPF.ItemIDs.SequencedAddrItem) {
    const data_buf = dataArray[0].data;
    result.connection_id = data_buf.readUInt32LE(0);
    result.sequence_number = data_buf.readUInt32LE(4);
  }
  const connectedData = dataArray[1].data;
  let sequenceCount;
  let applicationData = connectedData;

  if (class_num) {
    //class 1
    result.sequence_count = connectedData.readUInt16LE(0);
    applicationData =
      connectedData.length > 2 ? connectedData.subarray(2) : null;
  }

  switch (realtime_format) {
    case UDPDatagram.realTimeFormats.MODELESS:
      result.data = applicationData;
      break;
    case UDPDatagram.realTimeFormats.ZERO_LENGTH:
      if (applicationData) result.run_idle = true;
      else result.run_idle = false;
      result.data = applicationData;
      break;
    case UDPDatagram.realTimeFormats.HEARTBEAT:
      result.data = null;
      break;
    case UDPDatagram.realTimeFormats.HEADER_32BIT:
      if (applicationData.length >= 4) {
        //32-bit header equals 4 bytes.
        let _header = applicationData.readUInt32LE(0);
        result.run_idle = _header & 0x01;
        result.header_32bit = {
          COO: _header & 0x02,
          ROO: _header & 0x0c,
        };
        result.data =
          applicationData.length > 4 ? applicationData.subarray(4) : null;
      } else
        throw new Error(
          `Define 32-bit Header Format, but length of Header is only ${applicationData.length} bytes!`
        );
      break;
    default:
      console.log(
        `No such realtime format specified in number: ${realtime_format}. Please refer to UDPDatagram.realTimeFormats.`
      );
  }

  return result;
};

module.exports = {
  ...encapsulation,
  CPF,
  sendRRData,
  registerSessionReply,
  UDPDatagram,
};
