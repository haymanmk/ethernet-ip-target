const dgram = require("dgram");
const { ENIP } = require("../src/server/enip");
const { generateSessionID } = require("../src/server/utils");
const {
  registerSessionReply,
  CPF,
} = require("../src/server/enip/encapsulation");
const { MessageRouter, ForwardOpen } = require("../src/server/enip/cip");

const enip = new ENIP();
enip.createListener();

enip.on("Register Session Request", (data) => {
  console.log("Register Session Request");
  enip.state.session.id = generateSessionID();
  enip.socket.write(registerSessionReply(enip.state.session.id, data));
});

enip.on("SendRRData Request Received", (data, timeout) => {
  const server = dgram.createSocket("udp4");

  server.on("message", (msg, rinfo) => {
    console.log(`Server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  });
  server.on("listening", () => {
    const address = server.address();

    console.log(`Server listening ${address.address}:${address.port}`);
  });
  server.bind(2222, "172.16.0.24");

  const MRData = data[1]; //the first item in data arry is the Address Item.
  const parsedMRData = MessageRouter.parse(MRData.data);
  const forwardOpenRequest = ForwardOpen.parse(parsedMRData.request_data);
  const forwardOpenReply = ForwardOpen.build(forwardOpenRequest);

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
