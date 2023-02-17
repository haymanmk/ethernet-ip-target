const { Server } = require("net");
const { EIP_PORT } = require("../../node-ethernet-ip/src/config");
const encapsulation = require("../../node-ethernet-ip/src/enip/encapsulation");
const CIP = require("../../node-ethernet-ip/src/enip/cip");

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
      connection: { id: null, establishing: false, established: false },
      error: { code: null, msg: null },
    };

    this._initializeEventHandlers();
  }

  createListener(port = EIP_PORT) {
    super.listen(port, () => {
      console.log(`Sever is now listening on port ${port}`);
    });
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
    console.log(data);
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
          this.emit("Register Session Request", encapsulatedData.data);
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
