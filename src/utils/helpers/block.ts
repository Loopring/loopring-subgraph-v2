import { Token, Exchange, Block, Proxy } from "../../../generated/schema";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../../generated/OwnedUpgradabilityProxy/ERC20";
import { DEFAULT_DECIMALS } from "../../utils/decimals";
import {
  BIGINT_ZERO,
  BIGINT_ONE,
  BIGDECIMAL_ZERO,
  ZERO_ADDRESS,
  TRANSACTION_NOOP,
  TRANSACTION_DEPOSIT,
  TRANSACTION_SPOT_TRADE,
  TRANSACTION_TRANSFER,
  TRANSACTION_WITHDRAWAL,
  TRANSACTION_ACCOUNT_UPDATE,
  TRANSACTION_AMM_UPDATE,
  TRANSACTION_SIGNATURE_VERIFICATION,
  TRANSACTION_NFT_MINT,
  TRANSACTION_NFT_DATA
} from "../../utils/constants";
import { extractData, extractInt, getTxData } from "./data";
import { intToString, compoundId } from "./index";
import { getProxy } from "./upgradabilityProxy";
import {
  processDeposit,
  processSpotTrade,
  processTransfer,
  processWithdrawal,
  processAccountUpdate,
  processAmmUpdate,
  processSignatureVerification,
  processNFTMint,
  processNFTData
} from "./transactionProcessors";

export function getOrCreateBlock(internalID: BigInt): Block {
  let id = internalID.toString();
  let block = Block.load(id);

  if (block == null) {
    block = new Block(id);
    block.internalID = internalID;
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
  }

  return block as Block;
}

export function processBlockData(block: Block, proxy: Proxy): Block {
  let data = block.data.slice(2); // Remove the 0x beginning of the hex string
  let offset = 0;

  // General data
  offset += 20 + 32 + 32 + 4;
  block.protocolFeeTakerBips = extractInt(data, offset, 1);
  offset += 1;
  block.protocolFeeMakerBips = extractInt(data, offset, 1);
  offset += 1;
  block.numConditionalTransactions = extractInt(data, offset, 4);
  offset += 4;
  block.operatorAccountID = extractInt(data, offset, 4);
  offset += 4;
  block.operatorAccount = intToString(block.operatorAccountID);

  for (let i = 0; i < block.blockSize; i++) {
    let txData = getTxData(data, offset, i, block.blockSize);

    let txId = compoundId(block.id, intToString(i));

    let txType = txData.slice(0, 2);

    if (txType == TRANSACTION_NOOP) {
      // Do nothing
    } else if (txType == TRANSACTION_DEPOSIT) {
      processDeposit(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_WITHDRAWAL) {
      processWithdrawal(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_TRANSFER) {
      processTransfer(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_SPOT_TRADE) {
      processSpotTrade(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_ACCOUNT_UPDATE) {
      processAccountUpdate(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_AMM_UPDATE) {
      processAmmUpdate(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_SIGNATURE_VERIFICATION) {
      processSignatureVerification(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_NFT_MINT) {
      if (i + 1 < block.blockSize) {
        txData = txData.concat(getTxData(data, offset, i + 1, block.blockSize));
        if (i + 2 < block.blockSize) {
          txData = txData.concat(
            getTxData(data, offset, i + 2, block.blockSize)
          );
        }
      }
      processNFTMint(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_NFT_DATA) {
      processNFTData(txId, txData, block, proxy);
    } else {
      log.warning("Unknown transaction type encountered, raw tx data: {}", [
        txData
      ]);
    }
  }

  return block as Block;
}
