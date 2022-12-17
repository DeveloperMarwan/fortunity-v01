// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.6;

interface IFortTfi {
     function getTfiValue() external view returns (int256);
     function updateTfiValue() external;
}