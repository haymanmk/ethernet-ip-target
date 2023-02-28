const FORWARD_OPEN = require("../src/server/enip/cip/forward_open");

const buf = Buffer.from(
  "03fab97bd50eae99c4047063ff00ffffffff03000000a0860100f640a086010092280104200424012c652c64",
  "hex"
);

const result = FORWARD_OPEN.parse(buf);

console.log(result);
