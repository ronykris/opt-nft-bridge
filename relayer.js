import Web3 from 'web3';
import { OVM_L1ETHGateway, OVM_ETH } from '@eth-optimism/contracts';
import dotenv from 'dotenv'

dotenv.config()

async function stakeOnChain(providerUrl, privateKey, amount) {

    const web3 = new Web3(providerUrl)
    const l1Contract = new web3.eth.Contract(OVM_L1ETHGateway.abi)
    const l1EthGateway = await l1Contract
        .deploy({
            data: OVM_L1ETHGateway.bytecode
        })
        .send({
            from: privateKey,
            gas: 6000000,
            gasPrice: 0
        });

    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const balance = await web3.eth.getBalance(account.address);

    if (balance < amount) {
        throw new Error('Insufficient balance to stake');
    }
    const tokenContract = new web3.eth.Contract(
        OVM_ETH.abi,
        OVM_ETH.address
    );
    await tokenContract.methods
        .approve(l1EthGateway.options.address, amount)
        .send({ from: account.address });

    await l1EthGateway.methods
        .deposit()
        .send({ from: account.address, value: amount, gasPrice: 0 });

    console.log(`Successfully staked ${amount} ETH on the Optimism chain`);
}

async function monitorNewBlocks(providerUrl) {
    const web3 = new Web3(providerUrl);
    let previousBlockHeight = 0;
    const subscription = web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
        if (error) {
            console.error(error);
            return;
        }
        if (blockHeader.number !== previousBlockHeight) {
            console.log(`New block detected! Block number: ${blockHeader.number}`);
            previousBlockHeight = blockHeader.number;
            return previousBlockHeight
        }
    });

    subscription.on('error', (error) => {
        console.error(error);
    });
}

async function isBlockFull(providerUrl, monitoredBlockNumber) {

    const web3 = new Web3(providerUrl);
    const block = await web3.eth.getBlock(monitoredBlockNumber);
    const totalGasUsed = block.transactions.reduce((acc, tx) => acc + tx.gas, 0);

    if (totalGasUsed >= block.gasLimit) {
        console.log(`Block ${monitoredBlockNumber} is full`);
        return true;
    } else {
        console.log(`Block ${monitoredBlockNumber} is not full`);
        return false;
    }
}

async function finalizeBlock(providerUrl) {
    const web3 = new Web3(providerUrl);
    try {
        web3.eth.getAccounts(function(error, account) {
            web3.eth.sendTransaction({
                from: web3.eth.accounts[0],
                to: "0x943....",
                value: "1000000000000000000" // 1ETH                    
            }, function(err, transactionHash) {
                if (!err)
                    console.log(transactionHash + " finalized!");
            });
        });
    } catch (error) {
        console.error(`Error finalizing : $ { error }`)
    }
}


async function getMerkleRoot(providerUrl, monitoredBlockNumber) {
    const web3 = new Web3(providerUrl);

    function generateMerkleTree(hashes) {
        if (hashes.length === 0) {
            return [];
        }

        if (hashes.length === 1) {
            return [hashes[0]];
        }

        const nextLevelHashes = [];

        for (let i = 0; i < hashes.length; i += 2) {
            const leftHash = hashes[i];
            const rightHash = i + 1 < hashes.length ? hashes[i + 1] : leftHash;
            const combinedHash = web3.utils.keccak256(leftHash + rightHash);
            nextLevelHashes.push(combinedHash);
        }

        return [...generateMerkleTree(nextLevelHashes), ...nextLevelHashes];
    }

    const block = await web3.eth.getBlock(monitoredBlockNumber);
    const transactionHashes = block.transactions.map(tx => tx.hash);
    const merkleTree = generateMerkleTree(transactionHashes);
    const merkleRoot = merkleTree[merkleTree.length - 1];
    return merkleRoot;
}


async function relay(destProviderUrl) {
    const web3 = new Web3(destProviderUrl);
    try {
        web3.eth.getAccounts(function(error, account) {
            web3.eth.sendTransaction({
                from: web3.eth.accounts[0],
                to: "0x943....", // bridge contract on dest chain
                value: "1000000000000000000" // 1ETH                    
            }, function(err, transactionHash) {
                if (!err)
                    console.log(transactionHash + " relayed!");
            });
        });
    } catch (error) {
        console.error(`Error relaying : $ { error }`)
    }
}