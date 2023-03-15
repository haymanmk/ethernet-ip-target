const IOServer = require("../src/server/enip/io/class0_1");

const config = {
  inputInstance: {
    size: 2,
  },
  outputInstance: {
    size: 2,
  },
};
let ioServer = new IOServer(config);
