const { upgrades, ethers } = require("hardhat");
const { parseEther, parseUnits } = require("ethers/lib/utils");
const uniswapFactory = require("../artifacts/@uniswap/v3-core/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const { encodePriceSqrt } = require("../scripts/utilities");

const localChainId = "31337";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer, wallet1 } = await getNamedAccounts();
  const chainId = await getChainId();
  const uniFeeTier = 10000; // 1%

  const wethPriceFeedAddress = "0x8B64968F69E669faCc86FA3484FD946f1bBE7c91";
  const wbtcPriceFeedAddress = "0x9A86494Ba45eE1f9EEed9cFC0894f6C5d13a1F0b";
  const vMATICpriceFeedAddress = "0xC0340c0831Aa40A0791cF8C3Ab4287EB0a9705d8";
  // const truflationOracleAddress = "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690";
  const linkTokenAddress = "0xf18774574148852771c2631d7d06E2A6c8b44fCA";
  const truflationJobId = "2e1bcb542b9d127789985dfd01653be7";
  const truflationFee = ethers.utils.parseEther("0.1"); // 100000000000000000
  const truflationConsumerAddress =
    "0x20BBE62B175134D21b10C157498b663F048672bA";
  const traderWalletAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // TESTING ONLY!!!

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

  // need to format 0x64 0s to a bytes32[] in JS b4 passing in
  const amount = ethers.BigNumber.from(0);
  const amount2 = ethers.BigNumber.from(10);
  await fortTfi.setTfiValue(
    ethers.utils.hexZeroPad(amount, 32),
    ethers.utils.hexZeroPad(amount2, 32)
  );
  console.log("Set Tfi data: ", amount2);

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

  // setTimeout(await MATICUSDChainlinkPriceFeedV2.cacheTwap(ethers.BigNumber.from(900)), 1000);
  // console.log("Set observations[0] price with MaticUsdPriceFeedV2.cacheTwap");
  // await MATICUSDChainlinkPriceFeedV2.update();
  // console.log("MATICUSDChainlinkPriceFeedV2 update() called");

  // var thePrice = await MATICUSDChainlinkPriceFeedV2.getPrice(0);
  // console.log("Current MATICUSD price at 0min interval: ", thePrice);
  console.log("baseToekn 1");
  const BaseToken = await ethers.getContractFactory("BaseToken");
  console.log("baseToekn 2");
  const baseToken = await upgrades.deployProxy(BaseToken, [
    "vMATIC",
    "vMATIC",
    MATICUSDChainlinkPriceFeedV2.address,
    fortTfi.address,
  ]);
  console.log("baseToekn 3");
  await baseToken.deployed();
  console.log("BaseToken vMATIC deployed to: ", baseToken.address);

  let QuoteToken = await ethers.getContractFactory("QuoteToken");
  let quoteToken = await upgrades.deployProxy(QuoteToken, ["vUSD", "vUSD"]);
  await quoteToken.deployed();
  while (
    ethers.BigNumber.from(baseToken.address).gt(
      ethers.BigNumber.from(quoteToken.address)
    )
  ) {
    QuoteToken = await ethers.getContractFactory("QuoteToken");
    quoteToken = await upgrades.deployProxy(QuoteToken, ["vUSD", "vUSD"]);
    await quoteToken.deployed();
  }

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

  // await MATICUSDChainlinkPriceFeedV2.update();
  // await usdc.mint(wallet1, ethers.utils.parseEther("1"));

  // await MATICUSDChainlinkPriceFeedV2.cacheTwap(ethers.BigNumber.from(900));
  // console.log("Set observations[0] price with MaticUsdPriceFeedV2.cacheTwap");


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
    fortTfi.address,
  ]);
  await exchange.deployed();
  console.log("Exchange deployed to: ", exchange.address);
  await exchange.setAccountBalance(accountBalance.address);
  console.log(
    "finished setting the account balance address on the exchange contract"
  );
  await orderBook.setExchange(exchange.address);
  console.log(
    "finished setting the exchange address on the orderBook contract"
  );

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
    750000, // debtNonSettlementTokenValueRatio
    500000, // liquidationRatio
    2000, // mmRatioBuffer
    30000, // clInsuranceFundFeeRatio
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
  const initPrice = "1.51373306858723226652";
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

  await exchange.setMaxTickCrossedWithinBlock(baseToken.address, 1000);
  console.log("set MaxTickCrossedWithinBlock mapping");

  await console.log("Deployment script done...");
};
module.exports.tags = ["clearingHouseConfig"];
