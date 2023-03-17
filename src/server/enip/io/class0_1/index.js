/**
 * This is an Application Class that manages data consumption and producing
 * with EtherNet/IP.
 *
 */

const { ENIP } = require("../..");
const {
  registerSessionReply,
  CPF,
  UDPDatagram,
} = require("../../encapsulation");
const { MessageRouter, ForwardOpen } = require("../../cip");
const { UDPServer } = require("../../../udp");
const { generate32BitID, promiseTimeout } = require("../../../utils");
const InputMap = require("../input_map");
const OutputMap = require("../output_map");

class IOServer {
  constructor(config, class_num = 1) {
    this.class_num = class_num;

    this.enip = new ENIP();
    this.enip.createListener();

    this.udpServer = new UDPServer();

    this.state = {
      o_t_connection: {
        network_connection_id: generate32BitID(),
        sequence_number: 0,
        sequence_count: 0,
      },
      t_o_connection: {
        network_connection_id: null,
        sequence_number: 0,
        sequence_count: 0,
      },
    };

    this.config = config;

    this.OTSize = config.inputInstance.size;
    this.TOSize = config.outputInstance.size;

    this.inputData = Buffer.alloc(this.OTSize);
    this.outputData = Buffer.alloc(this.TOSize);

    this.inputMap = new InputMap();
    this.outputMap = new OutputMap(this.outputData);

    this._initEventHandler();
  }

  _initEventHandler() {
    this.enip.on(
      "Register Session Request",
      this._handleRegisterSessionRequest.bind(this)
    );
    this.enip.on(
      "SendRRData Request Received",
      this._handleSendRRDataRequest.bind(this)
    );
    this.enip.on(
      "Unhandled Encapsulated Command Received",
      this._handleUnknownEncapsulatedCommand.bind(this)
    );

    this.udpServer.on("UDP listening", this._handleUDPListening.bind(this));

    this.udpServer.on(
      "UDP message received",
      this._handleUDPMessageReceived.bind(this)
    );
  }

  _handleRegisterSessionRequest(data) {
    this.enip.state.session.id = generate32BitID();
    try {
      this.enip.socket.write(
        registerSessionReply(this.enip.state.session.id, data)
      );
    } catch (err) {
      throw new Error(
        `[!]ERROR occurred during writing RegisterSession reply to socket: ${err} `
      );
    }
  }

  _handleSendRRDataRequest(data_arr, timeout) {
    data_arr.forEach((item) => {
      const { TypeID, data } = item;
      const { Null, UCMM, SockaddrO2T, SockaddrT2O } = CPF.ItemIDs;
      switch (TypeID) {
        case Null:
          this.NullAddress = 0x00;
          break;
        case UCMM:
          this.MessageRouterRequest = MessageRouter.parse(data);
          break;
        case SockaddrO2T:
          this.sockaddrO2T = CPF.parseSockaddr(data);
          break;
        case SockaddrT2O:
          this.sockaddrT2O = CPF.parseSockaddr(data);
          break;
        default:
          console.log(`Cannot handle Type ID: ${TypeID}`);
      }
    });

    //Make sure a UCMM request occurred
    if (this.NullAddress === 0 && this.MessageRouterRequest) {
      this._forwardOpen();
    }
  }

  _handleUnknownEncapsulatedCommand(data) {
    console.log(`Unhandled data received: ${data.commandCode}`);
  }

  _handleUDPListening() {
    this._startSendData(this.forwardOpenRequest.t_o_rpi);
  }

  _handleUDPMessageReceived(msg, rinfo) {
    const parsedInputMsg = UDPDatagram.parse(
      msg,
      this.class_num,
      UDPDatagram.realTimeFormats.HEADER_32BIT
    );
    if (
      parsedInputMsg.connection_id !==
      this.state.o_t_connection.network_connection_id
    )
      return;

    if (
      parsedInputMsg.sequence_number < this.state.o_t_connection.sequence_number
    )
      return;

    this.state.o_t_connection.sequence_number = parsedInputMsg.sequence_number;

    parsedInputMsg.data.copy(this.inputData, 0);
    console.log(this.inputData);

    if (this.timeoutID) clearTimeout(this.timeoutID);

    this.timeoutID = setTimeout(() => {
      console.log("Originator disconnected");
      this._stopSendData();
    }, this.forwardOpenRequest.actual_timeout / 1000);
  }

  _forwardOpen(general_status = 0, additional_status = []) {
    this.forwardOpenRequest = ForwardOpen.parse(
      this.MessageRouterRequest.request_data
    );

    this.state.t_o_connection.network_connection_id =
      this.forwardOpenRequest.t_o_network_connection_id;

    const forwardOpenReplyBuf = ForwardOpen.build(
      this.forwardOpenRequest,
      general_status,
      additional_status,
      this.state.o_t_connection.network_connection_id
    );

    //create sockaddr info
    this.sockaddrArray = this._createSockaddrInfo();

    //create udp socket
    this.udpServer.createSocket();

    //bind udp socket port
    this._bindUDPPort();

    this.enip.write_cip(
      forwardOpenReplyBuf,
      false,
      10,
      null,
      this.sockaddrArray
    );
  }

  _createSockaddrInfo(local_addr = this.enip.localAddress) {
    if (!this.sockaddrT2O) {
      this.sockaddrT2O = {
        sin_family: 2,
        sin_port: this.enip.remotePort,
        sin_addr: this.enip.remoteAddress,
        sin_zero: Buffer.alloc(8, 0x00),
      };
      console.log(
        `Create a sockaddr info as sin_port=${this.sockaddrT2O.sin_port}, sin_addr=${this.sockaddrT2O.sin_addr}.`
      );
    }

    const { UDP_PORT } = require("../../../config");
    this.sockaddrO2T = {
      sin_family: 2,
      sin_port: UDP_PORT,
      sin_addr: local_addr,
      sin_zero: Buffer.alloc(8, 0x00),
    };

    return [
      CPF.buildSockaddr(this.sockaddrO2T, CPF.ItemIDs.SockaddrO2T),
      CPF.buildSockaddr(this.sockaddrT2O, CPF.ItemIDs.SockaddrT2O),
    ];
  }

  _bindUDPPort() {
    if (this.udpServer) {
      try {
        this.udpServer.bindPort(this.sockaddrT2O.sin_port);
      } catch (err) {
        console.log(`Error occurred during binding UDP socket port: ${err}`);
      }
    }
  }

  _startSendData(interval = 100000, ip = this.sockaddrT2O.sin_addr) {
    if (!this.intervalID)
      this.intervalID = setInterval(() => {
        this.state.t_o_connection.sequence_number > Math.pow(2, 32) - 1
          ? (this.state.t_o_connection.t_o_connection.sequence_number = 0)
          : this.state.t_o_connection.sequence_number++;
        this.state.t_o_connection.sequence_count > Math.pow(2, 16) - 1
          ? (this.state.t_o_connection.sequence_count = 0)
          : this.state.t_o_connection.sequence_count++;
        const packet = UDPDatagram.build(
          this.state.t_o_connection.network_connection_id,
          this.state.t_o_connection.sequence_number,
          this.outputData,
          this.class_num,
          this.state.t_o_connection.sequence_count
        );
        this.udpServer.sendData(packet, ip);
      }, interval / 1000);
  }

  _stopSendData() {
    if (this.intervalID) {
      clearInterval(this.intervalID);
      this.intervalID = null;
    }
    this.udpServer.closeSocket();
    this.state.o_t_connection.sequence_number = 0;
    this.state.o_t_connection.sequence_count = 0;
    this.state.t_o_connection.sequence_number = 0;
    this.state.t_o_connection.sequence_count = 0;
  }
}

module.exports = IOServer;
