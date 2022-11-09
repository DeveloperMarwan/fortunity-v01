# 🏗 Fortunity

# 🏄‍♂️ Setup Guide

Prerequisites: [Node (v16 LTS)](https://nodejs.org/en/download/) plus [Yarn (v1.x)](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

> clone/fork 🏗 fortunity-v01:

```bash
git clone https://github.com/DeveloperMarwan/fortunity-v01.git
```

> install and start your 👷‍ Hardhat chain:

```bash
cd fortunity-v01
yarn install
yarn chain
```

> in a second terminal window, setup the Chainlink hardhat starter kit:

Navigate to https://github.com/DeveloperMarwan/hardhat-starter-kit and follow the instructions there. Please make sure that you use a different folder than the current fortunity-v01 folder.  

> in a third terminal window, 🛰 deploy your fortunity-v01 contracts:

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

> **IMPORTANT**: Since the contract's address changes with each deployment, it will need to be updated in the hardhat_contracts.json file as well.

> in a fourth terminal window, start your 📱 frontend:

```bash
cd fortunity-v01
yarn start
```

🔏 Edit your smart contracts in `packages/hardhat/contracts`

📝 Edit your frontend `App.jsx` in `packages/react-app/src`

💼 Edit your deployment scripts in `packages/hardhat/deploy`

📱 Open http://localhost:3000 to see the app


# 💌 P.S.

🌍 You need an RPC key for testnets and production deployments, create an [Alchemy](https://www.alchemy.com/) account and replace the value of `ALCHEMY_KEY = xxx` in `packages/react-app/src/constants.js` with your new key.

📣 Make sure you update the `InfuraID` before you go to production. Huge thanks to [Infura](https://infura.io/) for our special account that fields 7m req/day!

