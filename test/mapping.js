const InputMap = require("../src/server/enip/io/input_map");
const OutputMap = require("../src/server/enip/io/output_map");

let inputData = Buffer.alloc(4);
let outputData = Buffer.alloc(4);

let inputMap = new InputMap();
let outputMap = new OutputMap(outputData);

outputMap.labelWord(0, "DM100");
outputMap.labelBit(1, 0, "MR100");

outputMap.setValue("DM100", 123);
console.log(outputData);
outputMap.setValue("MR100", true);
console.log(outputData);
console.log(outputMap.readValue("MR100"));

console.log(inputData.readUInt32LE(0));
inputData.writeUInt32LE(102);
inputMap.labelDoubleWords(0, "DM102");
inputMap.mapping(inputData);

console.log(inputMap.readValue("DM102"));
