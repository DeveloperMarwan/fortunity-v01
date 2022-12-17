// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.6;
pragma abicoder v2;

//need to update remappings to npm package for hardhat

import { Strings } from "./lib/FortStrings.sol";
import { ChainlinkClient } from "@chainlink/contracts/src/v0.7/ChainlinkClient.sol";
import { ConfirmedOwner } from "@chainlink/contracts/src/v0.7/dev/ConfirmedOwner.sol";
import { Chainlink } from "@chainlink/contracts/src/v0.7/Chainlink.sol";
import { LinkTokenInterface } from "@chainlink/contracts/src/v0.7/interfaces/LinkTokenInterface.sol";
import { SafeMathUpgradeable } from "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

contract FortTfi is ChainlinkClient, ConfirmedOwner(msg.sender) {
    using Chainlink for Chainlink.Request;
    using SafeMathUpgradeable for uint256;

    int256 public latestValue;

    uint256 public lastUpdatedBlock;
    uint256 public updateInterval = 2 days;
    address public oracleId;
    string public jobId;
    uint256 public fee;

    //
    // STRUCT
    //
    
    struct RequestData {
        string _service;
        string _data;
        string _keypath;
        string _abi;
        string _multiplier;
    }
    RequestData TfiRequest;

    //
    // INTERNAL NON-VIEW
    //

    constructor(        
            address oracleId_,
            string memory jobId_,
            uint256 fee_,
            address token_) {
        setChainlinkToken(token_);
        oracleId = oracleId_;
        jobId = jobId_;
        fee = fee_;
        TfiRequest = RequestData(
            "truflation/current", 
            '{"location":"us}',
            "yearOverYearInflation", 
            "int256", 
            "10000000000000000" //16 0s because 1 + CPI/100
        );            
    }

    //
    // PUBLIC NON-VIEW
    //

    function doTransferAndRequest(
        RequestData memory request,
        uint256 fee_
        ) public returns (bytes32 requestId) {
        require(LinkTokenInterface(getToken()).transferFrom(
               msg.sender, address(this), fee_), "transfer failed");
        Chainlink.Request memory req = buildChainlinkRequest(
            bytesToBytes32(bytes(jobId)),
            address(this), this.fulfillBytes.selector);
        req.add("service", request._service);
        req.add("data", request._data);
        req.add("keypath", request._keypath);
        req.add("abi", request._abi);
        req.add("multiplier", request._multiplier);
        req.add("refundTo",
                Strings.toHexString(uint256(uint160(msg.sender)), 20));
        return sendChainlinkRequestTo(oracleId, req, fee_);
    }

    function fulfillBytes(bytes32 _requestId, bytes memory bytesData)
        public recordChainlinkFulfillment(_requestId) {
        latestValue = toInt256(bytesData);
        lastUpdatedBlock = block.timestamp;
    }

    function updateTfiValue() public {
        if (block.timestamp >= lastUpdatedBlock.add(updateInterval)) {
            doTransferAndRequest(TfiRequest, fee);
        }
    }

    //A return function to Proxy
    function returnAllTokensToProxy() public onlyOwner {
        //sends LINK
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))));
        //sends ETH
        payable(msg.sender).transfer(address(this).balance);
    }

    //
    // PUBLIC ONLY-OWNER
    //

    function changeOracle(address _oracle) public onlyOwner {
        oracleId = _oracle;
    }

    function changeJobId(string memory _jobId) public onlyOwner {
        jobId = _jobId;
    }

    function changeFee(uint256 _fee) public onlyOwner {
        fee = _fee;
    }

    function changeToken(address _address) public onlyOwner {
        setChainlinkToken(_address);
    }

    function changeUpdateInterval(uint256 _interval) public onlyOwner {
        updateInterval = _interval;
    }

    function changeService(string memory service_) public onlyOwner {
        TfiRequest._service = service_;
    }

    function changeData(string memory data_) public onlyOwner {
        TfiRequest._data = data_;
    }

    function changeKeypath(string memory keypath_) public onlyOwner {
        TfiRequest._keypath = keypath_;
    }

    function changeAbi(string memory abi_) public onlyOwner {
        TfiRequest._abi = abi_;
    }

    function changeMultiplier(string memory multiplier_) public onlyOwner {
        TfiRequest._multiplier = multiplier_;
    }

    //
    // PUBLIC VIEW
    //

    function getToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function getTfiValue() public view returns (int256) {
        return latestValue;
    }

    //
    // INTERNAL PURE
    //

    function toInt256(bytes memory _bytes) internal pure
      returns (int256 value) {
          assembly {
            value := mload(add(_bytes, 0x20))
      }
   }

    // @dev Converts first 32 bytes of input bytes
    function bytesToBytes32(bytes memory source) internal pure 
    returns (bytes32 result_) {
        if (source.length == 0) {
            return 0x0;
        }
        assembly {
            result_ := mload(add(source, 32))
        }
    }

    // External - ONLY FOR TESTING, Get rid of b4 deployment. Mimics fulfillBytes
    function setTfiValue(bytes32 id, bytes memory bytesData) external {
        latestValue = toInt256(bytesData);
        lastUpdatedBlock = block.timestamp;
    }
}