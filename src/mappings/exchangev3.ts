import { log, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  TokenRegistered,
  SubmitBlocksCall,
  SubmitBlocks1Call,
  SubmitBlocks2Call,
  SubmitBlocksCallBlocksStruct
} from "../../generated/OwnedUpgradabilityProxy/OwnedUpgradabilityProxy";
import { Block, Proxy } from "../../generated/schema";
import {
  getOrCreateToken,
  getProxy,
  processBlockData,
  intToString
} from "../utils/helpers";
import { BIGINT_ZERO, BIGINT_ONE } from "../utils/constants";
import { DEFAULT_DECIMALS, toDecimal } from "../utils/decimals";

export function handleTokenRegistered(event: TokenRegistered): void {
  let tokenId = intToString(event.params.tokenId);
  let token = getOrCreateToken(tokenId, event.params.token);
  let proxy = getProxy();

  token.exchange = proxy.currentImplementation as String;
  proxy.tokenCount = proxy.tokenCount.plus(BIGINT_ONE);

  token.save();
  proxy.save();
}

export function handleSubmitBlocksV1(call: SubmitBlocksCall): void {
  handleSubmitBlocks(
    changetype<ethereum.Call>(call),
    changetype<Array<SubmitBlocksCallBlocksStruct>>(call.inputs.blocks)
  );
}

export function handleSubmitBlocksV2(call: SubmitBlocks1Call): void {
  handleSubmitBlocks(
    changetype<ethereum.Call>(call),
    changetype<Array<SubmitBlocksCallBlocksStruct>>(call.inputs.blocks)
  );
}

export function handleSubmitBlocksV3(call: SubmitBlocks2Call): void {
  handleSubmitBlocks(
    changetype<ethereum.Call>(call),
    changetype<Array<SubmitBlocksCallBlocksStruct>>(call.inputs.blocks)
  );
}

function handleSubmitBlocks(
  call: ethereum.Call,
  blockArray: Array<SubmitBlocksCallBlocksStruct>
): void {
  let proxy = getProxy();
  for (let i = 0; i < blockArray.length; i++) {
    proxy.blockCount = proxy.blockCount.plus(BIGINT_ONE);

    let blockData = blockArray[i];
    let block = new Block(proxy.blockCount.toString());
    
    // conditionally updated
    block.transactionCount = BIGINT_ZERO;
    block.depositCount = BIGINT_ZERO;
    block.withdrawalCount = BIGINT_ZERO;
    block.withdrawalNFTCount = BIGINT_ZERO;
    block.transferCount = BIGINT_ZERO;
    block.transferNFTCount = BIGINT_ZERO;
    block.addCount = BIGINT_ZERO;
    block.removeCount = BIGINT_ZERO;
    block.orderbookTradeCount = BIGINT_ZERO;
    block.swapCount = BIGINT_ZERO;
    block.swapNFTCount = BIGINT_ZERO;
    block.tradeNFTCount = BIGINT_ZERO;
    block.accountUpdateCount = BIGINT_ZERO;
    block.ammUpdateCount = BIGINT_ZERO;
    block.signatureVerificationCount = BIGINT_ZERO;
    block.nftMintCount = BIGINT_ZERO;
    block.nftDataCount = BIGINT_ZERO;
    
    // metadata
    block.internalID = proxy.blockCount;
    block.txHash = call.transaction.hash.toHexString();
    block.gasLimit = call.transaction.gasLimit;
    block.gasPrice = call.transaction.gasPrice;
    block.height = call.block.number;
    block.timestamp = call.block.timestamp;
    block.blockHash = call.block.hash.toHexString();

    // raw data except auxiliary data
    block.blockType = blockData.blockType;
    block.blockSize = blockData.blockSize;
    block.blockVersion = blockData.blockVersion;
    block.data = blockData.data.toHexString();
    block.proof = blockData.proof;
    block.storeBlockInfoOnchain = blockData.storeBlockInfoOnchain;
    block.offchainData = blockData.offchainData;

    block = processBlockData(block as Block, proxy as Proxy);

    block.save();
  }
  proxy.save();
}
