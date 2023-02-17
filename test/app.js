const { ENIP } = require("../src/server/enip");
const { generateSessionID } = require("../src/server/utils");
const { registerSessionReply } = require("../src/server/enip/encapsulation");

const enip = new ENIP();
enip.createListener();

enip.on("Register Session Request", (data) => {
  console.log("Register Session Request");
  enip.state.session.id = generateSessionID();
  enip.socket.write(registerSessionReply(enip.state.session.id, data));
});

enip.on("Unhandled Encapsulated Command Received", (data) => {
  console.log(`Unhandled Data Received: ${data.commandCode}`);
});
