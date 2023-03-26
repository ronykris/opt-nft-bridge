import Web3 from "web3";
import dotenv from 'dotenv'


dotenv.config()
const srcABI = [...] // ABI of src smart contract
const srcContractAddress = '0x...' // Src contract address
const dstABI = [...] // ABI of dst smart contract
const dstContractAddress = '0x...' // Dst contract address

export const srcObj = {
    srcWeb3: new Web3(process.env.goerli_opt_testnet),
    srcContract: new srcWeb3.eth.Contract(srcABI, srcContractAddress)
}

export const dstObj = {
    dstWeb3: new Web3(process.env.goerli_arb_testnet),
    dstContract: new dstWeb3.eth.Contract(dstABI, dstContractAddress)
}



export async function stake(chain) {
    const stake_amount = 0.3
    if (chain === src) {
        srcObj.srcContract.methods.deposite({ value: srcObj.srcWeb3.utils.toWei(stake_amount) }).call()
            .then(result => {
                console.log(result) // Need to verify result and fix the console log indicating stake is successful
                return 'Success'
            })
            .catch(error => console.log(error))
    } else if (chain === dst) {
        dstObj.dstContract.methods.deposite({ value: dstObj.dstWeb3.utils.toWei(stake_amount) }).call()
            .then(result => {
                console.log(result) // Need to verify result and fix the console log indicating stake is successful
                return 'Success'
            })
            .catch(error => console.log(error))
    } else {
        throw new Error('Incorrect chain supplied');
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