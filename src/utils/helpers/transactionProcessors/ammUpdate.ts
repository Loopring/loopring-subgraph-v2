import { AmmUpdate, Block, Token, Proxy } from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { extractData, extractBigInt, extractInt } from "../data";
import {
  getOrCreatePool,
  getToken,
  intToString,
  compoundIdToSortableDecimal
} from "../index";
import { TRANSACTION_AMM_UPDATE_TYPENAME, BIGINT_ONE } from "../../constants";

// interface AmmUpdate {
//   owner?: string;
//   accountID?: number;
//   tokenID?: number;
//   feeBips?: number;
//   tokenWeight?: BN;
//   nonce?: number;
//   balance?: BN;
// }
//
// /**
//  * Processes amm update requests.
//  */
// export class AmmUpdateProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const update = this.extractData(txData);
//
//     const account = state.getAccount(update.accountID);
//     const balance = account.getBalance(update.tokenID);
//
//     account.nonce++;
//     account.feeBipsAMM = update.feeBips;
//     balance.weightAMM = update.tokenWeight;
//
//     return update;
//   }
//
//   public static extractData(data: Bitstream) {
//     const update: AmmUpdate = {};
//     let offset = 1;
//
//     // Read in the AMM update data
//     update.owner = data.extractAddress(offset);
//     offset += 20;
//     update.accountID = data.extractUint32(offset);
//     offset += 4;
//     update.tokenID = data.extractUint16(offset);
//     offset += 2;
//     update.feeBips = data.extractUint8(offset);
//     offset += 1;
//     update.tokenWeight = data.extractUint96(offset);
//     offset += 12;
//     update.nonce = data.extractUint32(offset);
//     offset += 4;
//     update.balance = data.extractUint96(offset);
//     offset += 12;
//
//     return update;
//   }
// }

export function processAmmUpdate(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.ammUpdateCount = proxy.ammUpdateCount.plus(BIGINT_ONE);
  block.ammUpdateCount = block.ammUpdateCount.plus(BIGINT_ONE);
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new AmmUpdate(id);
  transaction.typename = TRANSACTION_AMM_UPDATE_TYPENAME;
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1;

  transaction.owner = extractData(data, offset, 20);
  offset += 20;
  transaction.accountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.tokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.feeBips = extractInt(data, offset, 1);
  offset += 1;
  transaction.tokenWeight = extractBigInt(data, offset, 12);
  offset += 12;
  transaction.nonce = extractInt(data, offset, 4);
  offset += 4;
  transaction.balance = extractBigInt(data, offset, 12);
  offset += 12;

  let pool = getOrCreatePool(
    intToString(transaction.accountID),
    transaction.id,
    transaction.owner,
    proxy
  );
  pool.feeBipsAMM = transaction.feeBips;
  pool.lastUpdatedAt = transaction.internalID;
  pool.lastUpdatedAtTransaction = transaction.id;

  let accounts = new Array<String>();
  accounts.push(pool.id);

  transaction.pool = pool.id;
  transaction.accounts = accounts;

  pool.save();
  transaction.save();
}
