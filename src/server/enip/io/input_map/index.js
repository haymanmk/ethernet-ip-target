/**
 * Parse and Manage Input Data into a Mapping Table with user defined labels
 */
let LabelMappingTable = require("../mapping_table");

class InputMap extends LabelMappingTable {
  constructor() {
    super();
  }

  mapping(data) {
    this._map.forEach((map) => {
      switch (map.size) {
        case 1:
          map.value = Boolean(data[map.byte_offset] & (1 << map.bit_offset));
          break;
        case 16:
          map.value = data.readUInt16LE(map.byte_offset);
          break;
        case 32:
          map.value = data.readUInt32LE(map.byte_offset);
          break;
      }
    });
  }

  readValue(label) {
    return this._map.find((map) => map.label === label).value;
  }
}

module.exports = InputMap;
