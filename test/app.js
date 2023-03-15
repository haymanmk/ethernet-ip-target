const dgram = require("dgram");
const { ENIP } = require("../src/server/enip");
const { generate32BitID } = require("../src/server/utils");
const {
  registerSessionReply,
  CPF,
  UDPDatagram,
} = require("../src/server/enip/encapsulation");
const { MessageRouter, ForwardOpen } = require("../src/server/enip/cip");
const { UDPServer } = require("../src/server/udp");

const enip = new ENIP();
enip.createListener();

enip.on("Register Session Request", (data) => {
  console.log("Register Session Request");
  enip.state.session.id = generate32BitID();
  enip.socket.write(registerSessionReply(enip.state.session.id, data));
});

const udpServer = new UDPServer();
let sequenceNumber = 0;
let sequenceCount = 0;

udpServer.on("UDP message received", (msg, rinfo) => {
  console.log(`UDP message received`);
  let parsedResult = UDPDatagram.parse(
    msg,
    1,
    UDPDatagram.realTimeFormats.MODELESS
  );
  console.log(`Got data: `);
  console.log(parsedResult.data);

  //create foo data
  let fooData = Buffer.from([0x02, 0x13]);
  sequenceNumber++;
  sequenceCount++;
  if (sequenceNumber > Math.pow(2, 32) - 1) sequenceNumber = 0;
  if (sequenceCount > Math.pow(2, 16) - 1) sequenceCount = 0;

  const packet = UDPDatagram.build(
    forwardOpenRequest.t_o_network_connection_id,
    sequenceNumber,
    fooData,
    1,
    sequenceCount
  );

  udpServer.sendData(packet, 2222, "172.16.0.10");
});

let forwardOpenRequest;
enip.on("SendRRData Request Received", (data, timeout) => {
  if (udpServer) {
    try {
      udpServer.bindPort(2222);
    } catch (err) {
      console.log(`Error occurred when binding UDP socket: ${err}`);
      // if (!err.includes("ERR_SOCKET_ALREADY_BOUND"))
      //   throw new Error(`Error occurred when binding UDP socket: ${err}`);
    }
  }
  const MRData = data[1]; //the first item in data arry is the Address Item.
  const parsedMRData = MessageRouter.parse(MRData.data);
  forwardOpenRequest = ForwardOpen.parse(parsedMRData.request_data);
  const { generate32BitID } = require("../src/server/utils");
  const forwardOpenReply = ForwardOpen.build(
    forwardOpenRequest,
    0,
    [],
    generate32BitID()
  );

  let sockaddrArray = null;
  //create sockaddr info item in CPF
  if (data.length > 2) {
    sockaddrArray = data.slice(2);
  }

  enip.write_cip(
    forwardOpenReply,
    (connected = false),
    (timeout = timeout),
    (cb = null),
    (extra_data = sockaddrArray)
  );
});

enip.on("Unhandled Encapsulated Command Received", (data) => {
  console.log(`Unhandled Data Received: ${data.commandCode}`);
});

function createIOData(data) {}
