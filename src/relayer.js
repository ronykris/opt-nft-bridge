import Web3 from "web3";
import dotenv from 'dotenv'

dotenv.config()
const srcABI = [...] // ABI of src smart contract
const srcContractAddress = '0x...' // Src contract address
const dstABI = [...] // ABI of dst smart contract
const dstContractAddress = '0x...' // Dst contract address

async function stake(chain) {
    const stake_amount = 0.3
    if (chain === src) {
        const web3 = new Web3(process.env.goerli_opt_testnet)
            //const abi = [...] // ABI of src smart contract
            //const contractAddress = '0x...'
        const contract = new web3.eth.Contract(srcABI, srcContractAddress)
        contract.methods.deposite({ value: web3.utils.toWei(stake_amount) }).call()
            .then(result => {
                console.log(result) // Need to verify result and fix the console log indicating stake is successful
                return 'Success'
            })
            .catch(error => console.log(error))
    } else if (chain === dst) {
        const web3 = new Web3(process.env.goerli_arb_testnet)
            //const abi = [...] // ABI of dst smart contract
            //const contractAddress = '0x...'
        const contract = new web3.eth.Contract(dstABI, dstContractAddress)
        contract.methods.deposite({ value: web3.utils.toWei(stake_amount) }).call()
            .then(result => {
                console.log(result) // Need to verify result and fix the console log indicating stake is successful
                return 'Success'
            })
            .catch(error => console.log(error))
    } else {
        throw new Error('Incorrect chain supplied');
    }
}

async function getMerkleRoot(chain, txnHashes) {
    const srcWeb3 = new Web3(process.env.goerli_opt_testnet)
    const dstWeb3 = new Web3(process.env.goerli_arb_testnet)

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
        if (chain === src) return [...generateMerkleTree(srcWeb3, nextLevelHashes), ...nextLevelHashes];
        else if (chain === dst) return [...generateMerkleTree(dstWeb3, nextLevelHashes), ...nextLevelHashes];
    }
    if (chain === src) {
        const merkleTree = generateMerkleTree(srcWeb3, txnHashes);
        const merkleRoot = merkleTree[merkleTree.length - 1];
        return merkleRoot;
    } else if (chain === dst) {
        const merkleTree = generateMerkleTree(dstWeb3, txnHashes);
        const merkleRoot = merkleTree[merkleTree.length - 1];
        return merkleRoot;
    }

}

async function relay() {
    const web3 = new Web3(process.env.goerli_opt_testnet)
    const contract = new web3.eth.Contract(srcABI, srcContractAddress)
    const abi = [...] // ABI of spokebridge.sol
    const contractAddress = '0x...' // sokebridge.sol contract address
    const eventName = 'NewTransactionAddedToBlock'
    let eventCounter = 0
    let TRANS_PER_BLOCK = 2
    let txnHashes = []
    contract.events.NewTransactionAddedToBlock()
        .on('data', (event) => {
            var blockId = event.localBlockId
            var tokenId = event._tokenId
            var maker = event._msgSender()
            var receiver = event._receiver
            var localErc721Contract = event._erc721Contract
            var remoteErc721Contract = event.IContractMap(contractMap).getRemote(_erc721Contract) //Need to check with denis
            var encodedParams = web3.eth.abi.encodeParameters(
                ['unit256', 'address', 'address', 'address', 'address'], [tokenId, maker, receiver, localErc721Contract, remoteErc721Contract]
            )
            var txnHash = web3.utils.keccak256(encodedParams)
            txnHashes.push(txnHash)
            eventCounter++
            if (eventCounter > TRANS_PER_BLOCK) {
                console.log('Block finalized | new block is created')
                eventCounter = 0
                var root = getMerkleRoot(src, txnHashes)
                txnHashes = []
                const contract = new web3.eth.Contract(abi, contractAddress)
                contract.methods.addIncomingBlock(root).call()
                    .then(result => console.log(result)) // Need to figure out how to verify success and fix the console log indicating the block is relayed
                    .catch(error => console.log(error))
            }
        })
        .on('error', (error) => {
            console.error(error)
        });

}

async function main() {
    const srcStake = await stake(src)
    const dstStake = await stake(dst)
    if (srcStake === 'Success' && dstStake === 'Success') relay()
    else console.log('User to stake funds in the src and dst chains before proceeding!')

}

await main()