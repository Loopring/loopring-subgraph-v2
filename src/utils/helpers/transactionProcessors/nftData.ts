import {
  DataNFT,
  Block,
  Token,
  User,
  Pool,
  Proxy
} from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { extractData, extractBigInt, extractInt } from "../data";
import {
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  compoundIdToSortableDecimal
} from "../index";
import { TRANSACTION_NFT_DATA_TYPENAME, BIGINT_ONE } from "../../constants";

// interface NftData {
//   type?: number;
//   accountID?: number;
//   tokenID?: number;
//   minter?: string;
//   nftID?: string;
//   nftType?: number;
//   tokenAddress?: string;
//   creatorFeeBips?: number;
// }
//
// /**
//  * Processes nft data requests.
//  */
// export class NftDataProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const nftData = this.extractData(txData);
//     return nftData;
//   }
//
//   public static extractData(data: Bitstream, offset: number = 1) {
//     const nftData: NftData = {};
//
//     nftData.type = data.extractUint8(offset);
//     offset += 1;
//
//     nftData.accountID = data.extractUint32(offset);
//     offset += 4;
//     nftData.tokenID = data.extractUint16(offset);
//     offset += 2;
//     nftData.nftID = "0x" + data.extractBytes32(offset).toString("hex");
//     offset += 32;
//     nftData.creatorFeeBips = data.extractUint8(offset);
//     offset += 1;
//     nftData.nftType = data.extractUint8(offset);
//     offset += 1;
//     if (nftData.type === 0) {
//       nftData.minter = data.extractAddress(offset);
//       offset += 20;
//     } else {
//       nftData.tokenAddress = data.extractAddress(offset);
//       offset += 20;
//     }
//
//     return nftData;
//   }
// }

export function processNFTData(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.nftDataCount = proxy.nftDataCount.plus(BIGINT_ONE);
  block.nftDataCount = block.nftDataCount.plus(BIGINT_ONE);
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new DataNFT(id);
  transaction.typename = TRANSACTION_NFT_DATA_TYPENAME;
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1; // First byte is tx type

  transaction.type = extractInt(data, offset, 1);
  offset += 1;

  transaction.accountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.tokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.nftID = "0x" + extractData(data, offset, 32);
  offset += 32;
  transaction.creatorFeeBips = extractInt(data, offset, 1);
  offset += 1;
  transaction.nftType = extractInt(data, offset, 1);
  offset += 1;
  if (transaction.type == 0) {
    transaction.minter = "0x" + extractData(data, offset, 20);
    offset += 20;
  } else {
    transaction.tokenAddress = "0x" + extractData(data, offset, 20);
    offset += 20;
  }

  transaction.slots = new Array<String>();
  transaction.nfts = new Array<String>();

  transaction.save();
}
