/**
 * Build and Manage Output Data with Mapping Table.
 */
let LabelMappingTable = require("../mapping_table");

class OutputMap extends LabelMappingTable {
  constructor(data) {
    super();
    this.data = data;
  }

  mapping(data = this.data) {
    this._map.forEach((map) => {
      switch (map.size) {
        case 1:
          map.value
            ? (data[map.byte_offset] |= 1 << map.bit_offset)
            : (data[map.byte_offset] &= ~(1 << map.bit_offset));
          break;
        case 16:
          data.writeUInt16LE(map.value, map.byte_offset);
          break;
        case 32:
          data.writeUInt32LE(map.value, map.byte_offset);
          break;
      }
    });

    // return data;
  }

  individuleMapping(label, value, data = this.data) {
    const map = this._map[this._map.findIndex((map) => map.label === label)];

    switch (map.size) {
      case 1:
        map.value
          ? (data[map.byte_offset] |= 1 << map.bit_offset)
          : (data[map.byte_offset] &= ~(1 << map.bit_offset));
        break;
      case 16:
        data.writeUInt16LE(map.value, map.byte_offset);
        break;
      case 32:
        data.writeUInt32LE(map.value, map.byte_offset);
        break;
    }
  }

  setValue(label, value, data = this.data) {
    this._map[this._map.findIndex((map) => map.label === label)].value = value;
    this.individuleMapping(label, value, data);
  }

  readValue(label, data = this.data) {
    return this._map[this._map.findIndex((map) => map.label === label)].value;
  }
}

module.exports = OutputMap;
