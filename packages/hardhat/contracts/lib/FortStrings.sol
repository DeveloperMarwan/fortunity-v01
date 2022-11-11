// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import { SafeMathUpgradeable } from "@openzeppelin-upgradeable/contracts/math/SafeMathUpgradeable.sol";

/**
 * @dev String operations.
 */
library Strings {
    using SafeMathUpgradeable for uint256;

    bytes16 private constant _SYMBOLS = "0123456789abcdef";
    uint8 private constant _ADDRESS_LENGTH = 20;

    // * @dev Added SafeMathUpgradeable to these operations, ref v0.8.0 Strings
    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(length.mul(2).add(2));
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = length.mul(2).add(1); i > 1; i.sub(1)) {
            buffer[i] = _SYMBOLS[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }
}