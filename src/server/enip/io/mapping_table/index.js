/**
 * Label the Content of Mapping Table
 */
class LabelMappingTable {
  constructor() {
    this._map = [];
  }

  get table() {
    return this._map;
  }

  labelBit(byte_offset, bit_offset, label, default_value = false) {
    this._map.push({
      size: 1,
      byte_offset: byte_offset,
      bit_offset: bit_offset,
      label: label,
      value: default_value,
    });
  }

  labelWord(byte_offset, label, default_value = 0) {
    this._map.push({
      size: 16,
      byte_offset: byte_offset,
      label: label,
      value: default_value,
    });
  }

  labelDoubleWords(byte_offset, label, default_value = 0) {
    this._map.push({
      size: 32,
      byte_offset: byte_offset,
      label: label,
      value: default_value,
    });
  }
}

module.exports = LabelMappingTable;
