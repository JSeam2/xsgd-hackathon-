const { BN, Long, bytes, units } = require("@zilliqa-js/util");
const {
  toBech32Address,
  fromBech32Address,
  getAddressFromPrivateKey,
} = require('@zilliqa-js/crypto');

console.log(fromBech32Address("zil1q20kq4wqhdz2a6ef9qc3xgf0zzetpv49tplscg"));
