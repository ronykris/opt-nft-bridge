import Web3 from "web3";
import dotenv from 'dotenv'
import { stake, getMerkleRoot, dstObj, srcObj } from "./utils";

var incomingRoot = 0

async function compareRoot(incomingRoot) {
    //const abi = [...] // ABI of spokebridge.sol
    //const contractAddress = '0x...' // sokebridge.sol contract address
    //const contract = new dstObj.dstWeb3.eth.Contract(abi, contractAddress)
    const eventName = 'IncomingBlockAdded'
    contract.events.IncomingBlockAdded()
        .on('data', (event) => {
            var merkleRoot = event._transactionRoot
            var blockId = event._blockId
            if (merkleRoot !== incomingRoot) {
                console.log(`Malicious relayer root: ${merkleRoot} and blockid: ${blockId} `)
                dstObj.dstContract.methods.challengeIncomingBlock(blockId).call()
                    .then(result => console.log(result)) // Need to figure out how to verify success and fix the console log indicating the block is relayed
                    .catch(error => console.log(error))
                srcObj.srcContract.methods.sendProof(blockId).call()
                    .then(result => console.log(result)) // Need to figure out how to verify success and fix the console log indicating the block is relayed
                    .catch(error => console.log(error))
            }
        })
        .on('error', (error) => {
            console.error(error)
        })
}

async function monitor() {
    //const abi = [...] // ABI of spokebridge.sol
    //const contractAddress = '0x...' // sokebridge.sol contract address
    //const contract = new srcObj.srcWeb3.eth.Contract(abi, contractAddress)
    const eventName = 'NewTransactionAddedToBlock'
    let eventCounter = 0
    let TRANS_PER_BLOCK = 4
    let txnHashes = []
    srcObj.srcContract.events.NewTransactionAddedToBlock()
        .on('data', (event) => {
            //var blockId = event.localBlockId
            var blockId = event._blockId
            var tokenId = event._tokenId
            var maker = event._maker
            var receiver = event._receiver
            var localErc721Contract = event._localERC721
            var remoteErc721Contract = event._remoteERC721 //Need to check with denis
            var encodedParams = srcObj.srcWeb3.eth.abi.encodeParameters(
                ['unit256', 'address', 'address', 'address', 'address'], [tokenId, maker, receiver, localErc721Contract, remoteErc721Contract]
            )
            var txnHash = srcObj.srcWeb3.utils.keccak256(encodedParams)
            txnHashes.push(txnHash)
            eventCounter++
            if (eventCounter > TRANS_PER_BLOCK) {
                console.log('Block finalized | new block is created')
                eventCounter = 0
                var root = await getMerkleRoot(src, txnHashes)
                incomingRoot = root
                txnHashes = []
                await compareRoot(incomingRoot)
            }
        })
        .on('error', (error) => {
            console.error(error)
        });

}

async function main() {
    const dstStake = await stake(dst)
    const srcStake = await stake(src)
    if (dstStake === 'Success' && srcStake === 'Success') monitor()
}

await main()