const { CIP } = require("ethernet-ip/src/enip");
const { Server } = require("net");
const { EIP_PORT } = require("../../node-ethernet-ip/src/config");
const encapsulation = require("../enip/encapsulation");

/**
 * EtherNet/IP
 *
 * @class ENIP
 * @extends {Server}
 */
class ENIP extends Server {
  constructor() {
    super();

    this.state = {
      TCP: { establishing: false, established: false },
      session: { id: null, establishing: false, established: false },
      connection: {
        id: null,
        establishing: false,
        established: false,
        seq_num: 0,
      },
      error: { code: null, msg: null },
    };

    this._initializeEventHandlers();
  }

  createListener(port = EIP_PORT) {
    super.listen(port, () => {
      console.log(`Sever is now listening on port ${port}`);
    });
  }

  /**
   * Write EtherNet/IP Data to Socket as an Unconnected Massaging
   * or a Transport Class 1 Datagram
   *
   * NOTE: Use this function instead of the Socket.write() function
   * to write data to socket.
   *
   * @param {Buffer} data - Data to be transport in Buffer
   * @param {boolean} [connected=false] - Connected or Unconnected Massaging
   * @param {number} [timeout=10] - Timeout in seconds
   * @param {functionii} [cb=null] -Callback function to be passed to socket.write() function.
   * @param {Array} [extra_data=null] - Extra data to be transport in Array, {TypeID, data}
   */
  write_cip(
    data,
    connected = false,
    timeout = 10,
    cb = null,
    extra_data = null
  ) {
    const { sendRRData, sendUnitData } = encapsulation;
    const { session, connection } = this.state;

    if (session.established) {
      const packet = connected
        ? sendUnitData(session.id, data, connection.id, connection.seq_num)
        : sendRRData(session.id, data, extra_data, timeout);

      if (cb) {
        this.socket.write(packet, cb);
      } else {
        this.socket.write(packet);
      }
    }
  }

  _initializeEventHandlers() {
    this.on("connection", this._handleConnectionEvent);
    this.on("error", this._handleErrorEvent);
  }

  _initializeSocketEventHandlers(socket) {
    socket.on("data", this._handleSocketDataEvent.bind(this));
    socket.on("close", this._handleSocketCloseEvent.bind(this));
  }

  _handleConnectionEvent(socket) {
    console.log("A client connected");
    this.socket = socket;
    this._initializeSocketEventHandlers(this.socket);
  }

  _handleErrorEvent(err) {
    this.state.session.established = false;
    this.state.TCP.established = false;
    console.log("An Error Occurred in Server!");
    console.log(`Error Message: ${err}`);
  }

  _handleSocketDataEvent(data) {
    const { header, CPF, commands } = encapsulation;
    const encapsulatedData = header.parse(data);
    const { statusCode, status, commandCode } = encapsulatedData;
    const { generateSessionID } = require("../utils");

    if (statusCode !== 0) {
      console.log(`Error <${statusCode}>:`.red, status.red);

      this.state.error.code = statusCode;
      this.state.error.msg = status;

      this.emit("Session Registration Failed", this.state.error);
    } else {
      this.state.error.code = null;
      this.state.error.msg = null;
      switch (commandCode) {
        case commands.RegisterSession:
          this.state.session.id = generateSessionID();
          this.state.session.established = true;
          this.emit("Register Session Request", encapsulatedData.data);
          break;
        case commands.SendRRData:
          // In command specific data, also known as encapsulated data here,
          // it consists of Interface handle <UDINT> and Timeout <UINT> at the beginning
          // for SendRRData Request.
          // The rest of the packet are the Address Items and Data Items packed in CPF,
          // Common Packet Format, which are going to be parsed into array of objects here.
          // And each object involves Type ID and its Data in it.

          // interface handle shall be zero for CIP packet.
          const interfaceHandle = encapsulatedData.data.readUInt32LE(0);
          if (interfaceHandle != 0)
            throw new Error("Interface Handle shall be zero.");

          const timeout = encapsulatedData.data.readUInt16LE(4);

          const sendRRDataBuf = Buffer.alloc(encapsulatedData.length - 6); // exclude the length of InterfaceHandle and Timeout.
          encapsulatedData.data.copy(sendRRDataBuf, 0, 6);

          const sendRRDataCPF = CPF.parse(sendRRDataBuf);

          this.emit("SendRRData Request Received", sendRRDataCPF, timeout);
          break;
        default:
          this.emit(
            "Unhandled Encapsulated Command Received",
            encapsulatedData
          );
      }
    }
  }

  _handleSocketCloseEvent(err) {
    this.state.session.established = false;
    this.state.TCP.established = false;
    this.socket.destroy();
    console.log("Socket closed");
    if (err) throw new Error("Socket Transmission Failure Occurred!");
  }
}

module.exports = { ENIP };
