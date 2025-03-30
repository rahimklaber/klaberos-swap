import {Address, Client, Keypair, nativeToScVal} from "bindings"
import {
    Networks,
    rpc,
    TransactionBuilder,
    Operation,
    xdr,
    hash,
    Asset,
} from "@stellar/stellar-sdk"
import { priceFromBin } from "../src/math"
import { basicNodeSigner } from "@stellar/stellar-sdk/contract"

let client = new rpc.Server("https://soroban-testnet.stellar.org")
let keypair = Keypair.fromSecret("SBR2NN7MTZD62KRPVI56TEYYDHIKKP66G4IZEBRL2TXG4RNNCMFNRH74")
let keypair2 = Keypair.fromSecret("SCL7HCYASI2CSHC6474BJYIQGR5NH2DDFHTUNXROBKYYL2EJW6F2WIJB")

let wasm: Uint8Array = await Bun.file("../concentraded-amm/target/wasm32-unknown-unknown/release/amm.wasm").bytes()
let account = await client.getAccount(keypair.publicKey())

let other_asset = new Asset("USDC", keypair2.publicKey())


async function uploadWasm(){
    let transaction = new TransactionBuilder(account, {fee: "100000", networkPassphrase: Networks.TESTNET})
        .addOperation(Operation.invokeHostFunction({
            func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(Buffer.from(wasm)),
            auth: [],
        }))
        .setTimeout(0)
        .build()
    transaction.sign(keypair)

    transaction = rpc.assembleTransaction(transaction, await client.simulateTransaction(transaction)).build()
    transaction.sign(keypair)
    let send_response = await client.sendTransaction(transaction)
    console.log(send_response)
}

async function initContract(){
    let deployTx = await Client.deploy(
        {conf: {
                active_bin: -1300,
                bin_step: 10,
                fee: 10,
                token_y: ("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"),
                token_x: other_asset.contractId(Networks.TESTNET),
            }},
        {
            wasmHash: hash(Buffer.from(wasm)),
            publicKey: keypair.publicKey(),
            rpcUrl: client.serverURL,
            networkPassphrase: Networks.TESTNET,
            signTransaction: async (xdr: string, opts?: {
                networkPassphrase?: string;
                address?: string;
                submit?: boolean;
                submitUrl?: string;
            }) => {
                let tx = TransactionBuilder.fromXDR(
                    xdr,
                    Networks.TESTNET
                )

                tx.sign(keypair)

                console.log(tx.hash().toString("hex"))

                return {signedTxXdr: tx.toXDR()}
            }
        }
    )

    await deployTx.signAndSend()

}

async function sendAsset(to: string, amount: string){
    let account = await client.getAccount(keypair2.publicKey())
    let transaction = new TransactionBuilder(account, {fee: "100", networkPassphrase: Networks.TESTNET})
        .addOperation(Operation.payment({
            destination: to,
            asset: other_asset,
            amount: amount
        }))
        .setTimeout(0)
        .build()

    transaction.sign(keypair2)
    let send_response = await client.sendTransaction(transaction)
    console.log(send_response)
}



// console.log(priceFromBin(10, -1300, false))

// console.log('key1', keypair.publicKey())
// console.log('key2', keypair2.publicKey())

// console.log(other_asset.contractId(Networks.TESTNET))

const CONTRACT = 'CCGJUUOFMNXOC75YLJSDWA74BULL7Y6V2LJFTRJLXENIBICECJ5TMCTZ'
//
// await uploadWasm()
// await initContract()

// await sendAsset("GCLRMPJOJSS7ZYF5TOQHUNGERPHKWZG53X5PLLF2GWSTBZTSQTUPBT5K", "1000000")

let contract = new Client({
    publicKey: keypair.publicKey(),
    contractId: CONTRACT,
    networkPassphrase: Networks.TESTNET,
    rpcUrl: client.serverURL,
    signTransaction: basicNodeSigner(keypair, Networks.TESTNET).signTransaction,
})

let up = await contract.upgrade({wasm_hash: hash(Buffer.from(wasm))}, {simulate: true})
await up.signAndSend()