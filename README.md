# 🏗 Fortunity

# 🏄‍♂️ Setup Guide

Prerequisites: [Node (v16 LTS)](https://nodejs.org/en/download/) plus [Yarn (v1.x)](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

> clone/fork 🏗 fortunity-v01:
In different directories,
```bash
git clone https://github.com/DeveloperMarwan/fortunity-v01.git
```
```bash
git clone https://github.com/KevinPatel04/ChainLink
```
```bash
git clone https://github.com/DeveloperMarwan/hardhat-starter-kit
```

> install and start your 👷‍ Hardhat chain:

> 1st Terminal Window:
Setup the Fortunity contracts https://github.com/DeveloperMarwan/fortunity-v01.git

```bash
cd fortunity-v01
yarn install
yarn chain
```

> 2nd Terminal WIndow:
 Setup the Chainlink hardhat starter kit @ https://github.com/DeveloperMarwan/hardhat-starter-kit

```bash
yarn install
yarn deploy
```
- reference the repository for additional options

You will need the following contract addresses after deployment is done:  
1. WETH mock aggregator
2. WBTC mock aggregator
3. BaseToken VMATIC mock aggregator
4. LINK token address
5. Truflation Oracle address
6. Truflation Job Id:
7. TruflationConsumer address

<b>Now comes the hard part. Lots of copy pasting ahead. Prepare yourself!</b>

In the fortunity-v01 directory, follow this directory path to open the 00_deploy_your_contract.js 
packages/hardhat/deploy/00_deploy_your_contract.js



> in a third terminal window, 🛰 deploy your fortunity-v01 contracts.  
> before deploying the contracts, navigate to the deployment script at /packages/hardhat/deploy/00_deploy_your_contract.js and update the follwoing values:  
> 1. weth_priceFeedAddress
> 2. wbtc_priceFeedAddress
> 3. vMATICpriceFeedAddress
> 4. linkTokenAddress
> 5. truflationJobId
> 6. truflationFee
> 7. truflationConsumerAddress
> 8. traderWalletAddress (This should be the address of the wallet that will interact with the dApp)

```bash
cd fortunity-v01
yarn deploy
```

Before starting the front-end app, we need to manually add the ClearingHouse contract to the app. Please follow the steps below to do that:  
1. Navigate to /packages/hardhat/artifacts/contracts/ClearingHouse.sol and open the ClearingHouse.json file.
2. Copy the "abi" element. Hint: if you are using vscode, you can collapse the element then copy it.
3. Navigate to /packages/react-app/src/contracts and open the file hardhat_contracts.json
4. add a new element at the end as per the image below. Use the abi element that you copied from step 2 above. You can get the address of the depoyed ClearingHouse contract from the terminal window where you ran the yarn depoy command for fortunity-v01 contracts. Please note that the "abi" elements in the screen shot are collapsed for display purposes.    
![Tux, the Linux mascot](https://user-images.githubusercontent.com/17074344/200719616-17572675-587d-4c66-995f-0c4f9d021641.png)

> **IMPORTANT**: Since the contract's address changes with each deployment, it will need to be updated in the hardhat_contracts.json file as well.<br>
> **IMPORTANT**: The deployment script will mint 1,000,000 USDC to the trader wallet address to use to interact with the dApp. Use the USDC contract address to import the tokens into MetaMask on the local network 8545.

> in a fourth terminal window, start your 📱 frontend:

```bash
cd fortunity-v01
yarn start
```
