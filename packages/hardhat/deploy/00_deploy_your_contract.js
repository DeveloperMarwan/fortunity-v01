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
const { encodePriceSqrt } = require("../scripts/utilities");

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

  const wethPriceFeedAddress = "0x851356ae760d987E095750cCeb3bC6014560891C";
  const wbtcPriceFeedAddress = "0xf5059a5D33d5853360D16C683c16e67980206f36";
  const vMATICpriceFeedAddress = "0x95401dc811bb5740090279Ba06cfA8fcF6113778";
  // const truflationOracleAddress = "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690";
  const linkTokenAddress = "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E";
  const truflationJobId = "2e1bcb542b9d127789985dfd01653be7";
  const truflationFee = ethers.utils.parseEther("0.1"); // 100000000000000000
  const truflationConsumerAddress =
    "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB";
  const traderWalletAddress = "0xe533a62026fd9F3F362c7506f7f2Bd5332e37BBa"; // TESTING ONLY!!!

  const cacheTwapInterval = 15 * 60;

  await deploy("FortTfi", {
    from: deployer,
    args: [
      truflationConsumerAddress,
      truflationJobId,
      truflationFee,
      linkTokenAddress,
    ],
    log: true,
  });
  const fortTfi = await ethers.getContract("FortTfi", deployer);
  console.log("FortTfi deployed to: ", fortTfi.address);

  await deploy("MATICUSDChainlinkPriceFeedV2", {
    from: deployer,
    contract: "ChainlinkPriceFeedV2",
    args: [vMATICpriceFeedAddress, cacheTwapInterval],
    log: true,
  });
  const MATICUSDChainlinkPriceFeedV2 = await ethers.getContract(
    "MATICUSDChainlinkPriceFeedV2",
    deployer
  );
  console.log(
    "MATICUSDChainlinkPriceFeedV2 deployed to: ",
    MATICUSDChainlinkPriceFeedV2.address
  );

  const BaseToken = await ethers.getContractFactory("BaseToken");
  const baseToken = await upgrades.deployProxy(BaseToken, [
    "vMATIC",
    "vMATIC",
    MATICUSDChainlinkPriceFeedV2.address,
  ]);
  await baseToken.deployed();
  console.log("BaseToken vMATIC deployed to: ", baseToken.address);
  await baseToken.setTfiContract(fortTfi.address);
  console.log("BaseToken.setTfiContract called");

  const QuoteToken = await ethers.getContractFactory("QuoteToken");
  const quoteToken = await upgrades.deployProxy(QuoteToken, ["vUSD", "vUSD"]);
  await quoteToken.deployed();
  console.log("QuoteToken vUSD deployed to:", quoteToken.address);

  const USDC = await ethers.getContractFactory("TestERC20");
  const usdc = await upgrades.deployProxy(USDC, ["TestUSDC", "USDC", 6], {
    initializer: "__TestERC20_init",
  });
  await usdc.deployed();
  console.log("USDC deployed to: ", usdc.address);
  const usdcDecimals = await usdc.decimals();
  await usdc.mint(traderWalletAddress, ethers.utils.parseEther("1000000"));
  console.log("Minted 1M USDC to trader wallet....WooHoo we are rich!!");

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
    priceFeed: wethPriceFeedAddress,
    collateralRatio: 0.7e6,
    discountRatio: 0.1e6,
    depositCap: parseUnits("1000", await weth.decimals()),
  });
  console.log("WETH collateral added");

  await collateralManager.addCollateral(wbtc.address, {
    priceFeed: wbtcPriceFeedAddress,
    collateralRatio: (0.7e6).toString(),
    discountRatio: (0.1e6).toString(),
    depositCap: parseUnits("1000", await wbtc.decimals()),
  });
  console.log("WBTC collateral added");

  await vault.setCollateralManager(collateralManager.address);
  await insuranceFund.setBorrower(vault.address);
  await accountBalance.setVault(vault.address);
  console.log("Finished setting up vault, insuranceFund, accountBalance");

  const ClearingHouse = await ethers.getContractFactory("ClearingHouse");
  const clearingHouse = await upgrades.deployProxy(ClearingHouse, [
    clearingHouseConfig.address,
    vault.address,
    quoteToken.address,
    uniswapFactoryContract.address,
    exchange.address,
    accountBalance.address,
    insuranceFund.address,
  ]);
  await clearingHouse.deployed();
  console.log("ClearingHouse deployed to: ", clearingHouse.address);

  await clearingHouseConfig.setSettlementTokenBalanceCap(
    ethers.constants.MaxUint256
  );
  await quoteToken.mintMaximumTo(clearingHouse.address);
  await baseToken.mintMaximumTo(clearingHouse.address);
  await quoteToken.addWhitelist(clearingHouse.address);
  await baseToken.addWhitelist(clearingHouse.address);
  await marketRegistry.setClearingHouse(clearingHouse.address);
  await orderBook.setClearingHouse(clearingHouse.address);
  await exchange.setClearingHouse(clearingHouse.address);
  await accountBalance.setClearingHouse(clearingHouse.address);
  await vault.setClearingHouse(clearingHouse.address);

  // deploy a pool
  const poolAddr = await uniswapFactoryContract.getPool(
    baseToken.address,
    quoteToken.address,
    uniFeeTier
  );
  const initPrice = "151.373306858723226652";
  const exFeeRatio = 10000; // 1%
  const ifFeeRatio = 100000; // 10%
  const uniPool = poolFactory.attach(poolAddr);
  await baseToken.addWhitelist(uniPool.address);
  await quoteToken.addWhitelist(uniPool.address);
  console.log("Finished deploy a pool");
  console.log("After step 1");
  await uniPool.initialize(encodePriceSqrt(initPrice, "1"));
  console.log("After step 2");
  const uniFeeRatio = await uniPool.fee();
  console.log("After step 3");
  // the initial number of oracle can be recorded is 1; thus, have to expand it
  await uniPool.increaseObservationCardinalityNext(500);
  console.log("After step 4");
  await marketRegistry.addPool(baseToken.address, uniFeeRatio);
  console.log("After step 5");
  await marketRegistry.setFeeRatio(baseToken.address, exFeeRatio);
  console.log("After step 6");
  await marketRegistry.setInsuranceFundFeeRatio(baseToken.address, ifFeeRatio);
  console.log("After step 7");

  console.log("Deployment script done...");
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
