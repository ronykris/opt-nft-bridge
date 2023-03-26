import Web3 from "web3";
import dotenv from 'dotenv'
import { createRequire } from "module"

const require = createRequire(
    import.meta.url)
const srcAbi = require('./srcAbi.json')
const dstAbi = require('./dstAbi.json')


dotenv.config()
const srcWeb3 = new Web3(process.env.goerli_opt_testnet)
const srcABI = srcAbi.abi // ABI of src smart contract
const srcContractAddress = '0x1A54F40445ee8B1F11cAf0D46C4EE5fC2c63FB2a' // Src contract address
const dstWeb3 = new Web3(process.env.goerli_arb_testnet)
const dstABI = dstAbi.abi // ABI of dst smart contract
const dstContractAddress = '0x2a20821048726be3D4CBAF55363B176B36c1Ed8F' // Dst contract address


export const srcObj = {
    srcWeb3: srcWeb3,
    srcContract: new srcWeb3.eth.Contract(srcABI, srcContractAddress)
}

export const dstObj = {
    dstWeb3: dstWeb3,
    dstContract: new dstWeb3.eth.Contract(dstABI, dstContractAddress)
}



export async function stake(chain) {
    const stake_amount = '0.2'
    if (chain === 'src') {
        //srcObj.srcContract.methods.deposite({ value: srcObj.srcWeb3.utils.toWei(stake_amount) }).call()
        srcObj.srcContract.methods.deposite().call()
            .then(result => {
                console.log('Result:' + result) // Need to verify result and fix the console log indicating stake is successful
                return 'Success'
            })
            .catch(error => console.log(error))
    } else if (chain === 'dst') {
        //dstObj.dstContract.methods.deposite({ value: dstObj.dstWeb3.utils.toWei(stake_amount) }).call()
        dstObj.dstContract.methods.deposite().call()
            .then(result => {
                console.log('Result:' + result) // Need to verify result and fix the console log indicating stake is successful
                return 'Success'
            })
            .catch(error => console.log(error))
    } else {
        throw new Error('Wrong chain supplied');
    }
}

export async function getMerkleRoot(chain, txnHashes) {
    function generateMerkleTree(chainProvider, hashes) {
        if (hashes.length === 0) {
            return [];
        }
        if (hashes.length === 1) {
            return [hashes[0]];
        }
        const nextLevelHashes = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const leftHash = hashes[i];
            const rightHash = i + 1 < hashes.length ? hashes[i + 1] : leftHash
            const combinedHash = chainProvider.utils.keccak256(leftHash + rightHash)
            nextLevelHashes.push(combinedHash)
        }
        if (chain === src) return [...generateMerkleTree(srcObj.srcWeb3, nextLevelHashes), ...nextLevelHashes];
        else if (chain === dst) return [...generateMerkleTree(dstObj.dstWeb3, nextLevelHashes), ...nextLevelHashes];
    }
    if (chain === src) {
        const merkleTree = generateMerkleTree(srcObj.srcWeb3, txnHashes);
        const merkleRoot = merkleTree[merkleTree.length - 1];
        return merkleRoot;
    } else if (chain === dst) {
        const merkleTree = generateMerkleTree(dstObj.dstWeb3, txnHashes);
        const merkleRoot = merkleTree[merkleTree.length - 1];
        return merkleRoot;
    }

}