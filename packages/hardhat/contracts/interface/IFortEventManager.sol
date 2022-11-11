// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.6;

// @dev Will be replacing with Subgraph or Moralis for future data retrieval

contract IFortEventManager {
    // Added to simplify data collection for Kevin, temporary
    event IndexPriceUpdated(uint256 _indexPrice);
    event MarketPriceUpdated(uint256 _mktPrice);
    event FundingRateUpdated(int256 _fundingRate);
    
    event IndexTwap(uint256 _indexTwap);
    event TotalLiquidity(uint256 _poolLiquidity);

    event ActivityChange(
        Action _action, 
        uint256 positionSize,
        uint256 colleratalChange, 
        uint256 executionPrice, 
        uint256 tradeFee,
        uint256 timestamp);

    enum Action {
        Buy,
        Sell,
        Stake,
        Withdraw
    }
}
