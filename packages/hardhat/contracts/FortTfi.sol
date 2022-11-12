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

    bytes public result;
    bytes32 internal requestId;
    mapping(bytes32 => bytes) public results;
    uint256 public lastTfiUpdatedBlock;
    uint256 public tfiUpdateInterval = 1 days;
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

    function initialize(
        address oracleId_,
        string memory jobId_,
        uint256 fee_,
        address token_
        //changed from initilizer ConfirmedOwner
    ) internal onlyOwner {
        setChainlinkToken(token_);
        oracleId = oracleId_;
        jobId = jobId_;
        fee = fee_;
        TfiRequest = RequestData(
            "truflation/current", 
            "yearOverYearInflation", 
            "int256", 
            "2", 
            '{"location":"us"}'
        );
    }

    //
    // PUBLIC NON-VIEW
    //
    
    function doRequest(
        RequestData memory request
        ) public returns (bytes32 requestId) {
          Chainlink.Request memory req = buildChainlinkRequest(
            bytesToBytes32(bytes(jobId)),
            address(this), this.fulfillBytes.selector);
        req.add("service", request._service);
        req.add("data", request._data);
        req.add("keypath", request._keypath);
        req.add("abi", request._abi);
        req.add("multiplier", request._multiplier);
        return sendChainlinkRequestTo(oracleId, req, fee);
    }

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
        result = bytesData;
        results[_requestId] = bytesData;
        requestId = _requestId;
        lastTfiUpdatedBlock = block.timestamp;
    }

    function updateTfiValue() public returns (int256 tfiValue) {
        if (block.timestamp >= lastTfiUpdatedBlock.add(tfiUpdateInterval)) {
            return getInt256(doTransferAndRequest(TfiRequest, fee));
        } else {
            return getInt256(requestId);
        }
    }

    //A return function to Proxy
    function returnTokensToProxy () public onlyOwner {
        //sends LINK
        LinkTokenInterface(getToken()).transfer(msg.sender, 
        LinkTokenInterface(getToken()).balanceOf(address(this)));
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

    function changeTfiUpdateInterval(uint256 _interval) public onlyOwner {
        tfiUpdateInterval = _interval;
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

    function getInt256(bytes32 _requestId) public view returns (int256) {
       return toInt256(results[_requestId]);
    }

    function getTfiValue() public view returns (int256) {
        return getInt256(requestId);
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
}