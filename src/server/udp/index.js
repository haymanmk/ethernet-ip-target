const dgram = require("dgram");
const { EventEmitter } = require("events");

class UDPServer extends EventEmitter {
  constructor() {
    super();
  }

  createSocket() {
    this.socket = dgram.createSocket("udp4");
  }

  bindPort(port = 2222, ip = "0.0.0.0") {
    this.port = port;
    this.socket.bind(port, ip);
    this._initialEventHandler();
  }

  sendData(data, ip, port = this.port) {
    this.socket.send(data, port, ip);
  }

  closeSocket() {
    this.socket.close();
  }

  _initialEventHandler() {
    this.socket.on("error", this._handleErrorEvent.bind(this));
    this.socket.on("close", this._handleCloseEvent.bind(this));
    this.socket.on("listening", this._handleListeningEvent.bind(this));
    this.socket.on("message", this._handleMessageEvent.bind(this));
  }

  _handleErrorEvent(err) {
    console.log(`UDP Error occurred: ${err}`);
  }

  _handleCloseEvent() {
    console.log(`UDP server closed`);
  }

  _handleListeningEvent() {
    const address = this.socket.address();
    console.log(`UDP server listening on ${address.address}:${address.port}`);
    this.emit("UDP listening");
  }

  _handleMessageEvent(msg, rinfo) {
    this.emit(`UDP message received`, msg, rinfo);
  }
}

module.exports = { UDPServer };
