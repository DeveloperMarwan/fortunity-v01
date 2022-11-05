// deploy/00_deploy_your_contract.js

// deploy the bytecode
/*
const { ethers, upgrades } = require("hardhat");
const {
  abi,
  bytecode
} = require("../artifacts/@uniswap/v3-core/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
*/
const { upgrades, ethers } = require("hardhat");
const { parseEther, parseUnits } = require("ethers/lib/utils");
const uniswapFactory = require("../artifacts/@uniswap/v3-core/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");


const localChainId = "31337";

// const sleep = (ms) =>
//   new Promise((r) =>
//     setTimeout(() => {
//       console.log(`waited for ${(ms / 1000).toFixed(3)} seconds`);
//       r();
//     }, ms)
//   );

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();
  const uniFeeTier = 10000; // 1%

  const weth_priceFeedAddress = "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0";
  const wbtc_priceFeedAddress = "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650";
  const base_token_priceFeedAddress =
    "0xc351628EB244ec633d5f21fBD6621e1a683B1181";

  const cacheTwapInterval = 15 * 60;

  const QuoteToken = await ethers.getContractFactory("QuoteToken");
  const quoteToken = await upgrades.deployProxy(QuoteToken, [
    "Quote Token",
    "FRTN",
  ]);
  await quoteToken.deployed();
  console.log("QuoteToken deployed to:", quoteToken.address);

  await deploy("ChainlinkPriceFeedV2", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [base_token_priceFeedAddress, cacheTwapInterval],
    log: true,
  });
  const chainlinkPriceFeedV2 = await ethers.getContract(
    "ChainlinkPriceFeedV2",
    deployer
  );
  console.log(
    "ChainlinkPriceFeedV2 deployed to: ",
    chainlinkPriceFeedV2.address
  );

  const BaseToken = await ethers.getContractFactory("BaseToken");
  const baseToken = await upgrades.deployProxy(BaseToken, [
    "BaseToken",
    "BSTK",
    chainlinkPriceFeedV2.address,
  ]);
  console.log("BaseToken deployed to: ", baseToken.address);

  const USDC = await ethers.getContractFactory("TestERC20");
  const usdc = await upgrades.deployProxy(USDC, ["TestUSDC", "USDC", 6], {
    initializer: "__TestERC20_init",
  });
  await usdc.deployed();
  console.log("USDC deployed to: ", usdc.address);
  const usdcDecimals = await usdc.decimals();

  const WETH = await ethers.getContractFactory("TestERC20");
  const weth = await upgrades.deployProxy(WETH, ["TestWETH", "WETH", 18], {
    initializer: "__TestERC20_init",
  });
  await weth.deployed();
  console.log("WETH deployed to: ", weth.address);

  const WBTC = await ethers.getContractFactory("TestERC20");
  const wbtc = await upgrades.deployProxy(WBTC, ["TestWBTC", "WBTC", 8], {
    initializer: "__TestERC20_init",
  });
  await wbtc.deployed();
  console.log("WBTC deployed to: ", wbtc.address);

  await deploy("UniswapV3Factory", {
    from: deployer,
    contract: {
      abi: uniswapFactory.abi,
      bytecode: uniswapFactory.bytecode,
    },
    log: true,
  });
  const uniswapFactoryContract = await ethers.getContract(
    "UniswapV3Factory",
    deployer
  );
  console.log("UniswapV3Factory deployed to:", uniswapFactoryContract.address);

  const ClearingHouseConfig = await ethers.getContractFactory(
    "ClearingHouseConfig"
  );
  const clearingHouseConfig = await upgrades.deployProxy(
    ClearingHouseConfig,
    [],
    { gasLimit: 3e7 }
  );
  await clearingHouseConfig.deployed();
  console.log("ClearingHouseConfig deployed to:", clearingHouseConfig.address);

  // prepare uniswap factory
  await uniswapFactoryContract.createPool(
    baseToken.address,
    quoteToken.address,
    uniFeeTier
  );
  console.log("Uniswap pool with base/quote tokens created");

  const poolFactory = await ethers.getContractFactory("UniswapV3Pool");

  const MarketRegistry = await ethers.getContractFactory("MarketRegistry");
  const marketRegistry = await upgrades.deployProxy(MarketRegistry, [
    uniswapFactoryContract.address,
    quoteToken.address,
  ]);
  await marketRegistry.deployed();
  console.log("MarketRegistry deployed to:", marketRegistry.address);

  const OrderBook = await ethers.getContractFactory("OrderBook");
  const orderBook = await upgrades.deployProxy(OrderBook, [
    marketRegistry.address,
  ]);
  await orderBook.deployed();
  console.log("OrderBook deployed to: ", orderBook.address);

  const AccountBalance = await ethers.getContractFactory("AccountBalance");
  const accountBalance = await upgrades.deployProxy(AccountBalance, [
    clearingHouseConfig.address,
    orderBook.address,
  ]);
  await accountBalance.deployed();
  console.log("AccountBalance deployed to: ", accountBalance.address);

  const Exchange = await ethers.getContractFactory("Exchange");
  const exchange = await upgrades.deployProxy(Exchange, [
    marketRegistry.address,
    orderBook.address,
    clearingHouseConfig.address,
  ]);
  await exchange.deployed();
  console.log("Exchange deployed to: ", exchange.address);
  await exchange.setAccountBalance(accountBalance.address);
  console.log(
    "finished setting the account balance address on the exchange contract"
  );
  await orderBook.setExchange(exchange.address);
  console.log("finished setting the exchange adress on the orderBook contract");

  const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
  const insuranceFund = await upgrades.deployProxy(InsuranceFund, [
    usdc.address,
  ]);
  await insuranceFund.deployed();
  console.log("InsuranceFund deployed to: ", insuranceFund.address);

  const Vault = await ethers.getContractFactory("Vault");
  const vault = await upgrades.deployProxy(Vault, [
    insuranceFund.address,
    clearingHouseConfig.address,
    accountBalance.address,
    exchange.address,
  ]);
  await vault.deployed();
  console.log("Vault deployed to: ", vault.address);

  const CollateralManager = await ethers.getContractFactory(
    "CollateralManager"
  );
  const collateralManager = await upgrades.deployProxy(CollateralManager, [
    clearingHouseConfig.address,
    vault.address,
    5, // maxCollateralTokensPerAccount
    750000,  // debtNonSettlementTokenValueRatio
    500000,  // liquidationRatio
    2000,    // mmRatioBuffer
    30000,   // clInsuranceFundFeeRatio
    parseUnits("10000", usdcDecimals), // debtThreshold
    parseUnits("500", usdcDecimals), // collateralValueDust
  ]);
  await collateralManager.deployed();
  console.log("CollateralManager deployed to: ", collateralManager.address);

  await collateralManager.addCollateral(weth.address, {
    priceFeed: weth_priceFeedAddress,
    collateralRatio: 0.7e6,
    discountRatio: 0.1e6,
    depositCap: parseUnits("1000", await weth.decimals()),
  });
  console.log("WETH collateral added");

  await collateralManager.addCollateral(wbtc.address, {
    priceFeed: wbtc_priceFeedAddress,
    collateralRatio: (0.7e6).toString(),
    discountRatio: (0.1e6).toString(),
    depositCap: parseUnits("1000", await wbtc.decimals()),
  });
  console.log("WBTC collateral added");

  await vault.setCollateralManager(collateralManager.address);
  await insuranceFund.setBorrower(vault.address);
  await accountBalance.setVault(vault.address);

  /*
  await deploy("YourContract", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    // args: [ "Hello", ethers.utils.parseEther("1.5") ],
    log: true,
    waitConfirmations: 5,
  });
  */

  // Getting a previously deployed contract
  // const YourContract = await ethers.getContract("YourContract", deployer);

  /*  await YourContract.setPurpose("Hello");
  
    // To take ownership of yourContract using the ownable library uncomment next line and add the 
    // address you want to be the owner. 
    
    await YourContract.transferOwnership(
      "ADDRESS_HERE"
    );

    //const YourContract = await ethers.getContractAt('YourContract', "0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A") //<-- if you want to instantiate a version of a contract at a specific address!
  */

  /*
  //If you want to send value to an address from the deployer
  const deployerWallet = ethers.provider.getSigner()
  await deployerWallet.sendTransaction({
    to: "0x34aA3F359A9D614239015126635CE7732c18fDF3",
    value: ethers.utils.parseEther("0.001")
  })
  */

  /*
  //If you want to send some ETH to a contract on deploy (make your constructor payable!)
  const yourContract = await deploy("YourContract", [], {
  value: ethers.utils.parseEther("0.05")
  });
  */

  /*
  //If you want to link a library into your contract:
  // reference: https://github.com/austintgriffith/scaffold-eth/blob/using-libraries-example/packages/hardhat/scripts/deploy.js#L19
  const yourContract = await deploy("YourContract", [], {}, {
   LibraryName: **LibraryAddress**
  });
  */

  // Verify from the command line by running `yarn verify`

  // You can also Verify your contracts with Etherscan here...
  // You don't want to verify on localhost
  // try {
  //   if (chainId !== localChainId) {
  //     await run("verify:verify", {
  //       address: YourContract.address,
  //       contract: "contracts/YourContract.sol:YourContract",
  //       constructorArguments: [],
  //     });
  //   }
  // } catch (error) {
  //   console.error(error);
  // }
};
module.exports.tags = ["clearingHouseConfig"];
