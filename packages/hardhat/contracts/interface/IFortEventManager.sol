// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.6;

// @dev Will be replacing with Subgraph or Moralis for future data retrieval

contract IFortEventManager {
    // Added to simplify data collection for Kevin, temporary
    event IndexPriceUpdated(uint256 _indexPrice);
    event MarketPriceUpdated(uint256 _mktPrice);
    event FundingRateUpdated(int256 _fundingRate);

    // Need to write contract that pulls in priceFeed addresses for tokens
    // in vault to calculate the USDC value of all tokens in Vault
    // The one local priceFeed works for Quote Token to USDC
    event TotalLiquidity(uint256 _vaultPlusPoolLiquidity);
    event LiquidityInPool(int128 _poolLiquidity);

    event ActivityChange(
        Action _action, 
        int256 positionSize,
        int256 colleratalChange, 
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
