import {
  MintNFT,
  Block,
  Token,
  User,
  Pool,
  Proxy,
  NonFungibleToken
} from "../../../../generated/schema";
import { BigInt, Address, Bytes, log } from "@graphprotocol/graph-ts";
import {
  extractData,
  extractBigInt,
  extractInt,
  extractBigIntFromFloat
} from "../data";
import {
  createIfNewAccount,
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  compoundIdToSortableDecimal,
  getOrCreateNFT,
  getOrCreateAccountNFTSlot,
  getAndUpdateAccountTokenBalanceDailyData,
  getAndUpdateAccountTokenBalanceWeeklyData
} from "../index";
import {
  TRANSACTION_NFT_MINT_TYPENAME,
  BIGINT_ONE,
  TRANSACTION_NFT_DATA
} from "../../constants";

// interface NftMint {
//   type?: number;
//   minterAccountID?: number;
//   tokenAccountID?: number;
//   toAccountID?: number;
//   toTokenID?: number;
//   nftID?: string;
//   amount?: BN;
//   feeTokenID?: number;
//   fee?: BN;
//   validUntil?: number;
//   storageID?: number;
//   minter?: string;
//   to?: string;
//   nftData?: string;
//   nftType?: number;
//   tokenAddress?: string;
//   creatorFeeBips?: number;
// }
//
// /**
//  * Processes NFT mint requests.
//  */
// export class NftMintProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const mint = this.extractData(txData);
//     if (mint.type === 0) {
//       mint.tokenAddress = state.accounts[mint.tokenAccountID].owner;
//     }
//
//     const minter = state.getAccount(mint.minterAccountID);
//     mint.minter = minter.owner;
//
//     const to = state.getAccount(mint.toAccountID);
//     if (mint.to && mint.to !== Constants.zeroAddress) {
//       to.owner = mint.to;
//     }
//
//     mint.nftData = this.getNftData(mint);
//
//     // Store the NFT data
//     state.nfts[mint.nftData] = {
//       minter: mint.minter,
//       nftType: mint.nftType,
//       token: mint.tokenAddress,
//       nftID: new BN(mint.nftID.slice(2), 16).toString(10),
//       creatorFeeBips: mint.creatorFeeBips
//     };
//
//     to.getBalance(mint.toTokenID).balance.iadd(mint.amount);
//     to.getBalance(mint.toTokenID).weightAMM = new BN(mint.nftData, 10);
//
//     minter.getBalance(mint.feeTokenID).balance.isub(mint.fee);
//
//     // Nonce
//     if (mint.type !== 2) {
//       const storage = minter
//         .getBalance(mint.feeTokenID)
//         .getStorage(mint.storageID);
//       storage.storageID = mint.storageID;
//       storage.data = new BN(1);
//     }
//
//     const operator = state.getAccount(block.operatorAccountID);
//     operator.getBalance(mint.feeTokenID).balance.iadd(mint.fee);
//
//     return mint;
//   }
//
//   public static extractData(data: Bitstream) {
//     const mint: NftMint = {};
//     let offset = 1;
//
//     // Check that this is a conditional update
//     mint.type = data.extractUint8(offset);
//     offset += 1;
//
//     mint.minterAccountID = data.extractUint32(offset);
//     offset += 4;
//     mint.toTokenID = data.extractUint16(offset);
//     offset += 2;
//     mint.feeTokenID = data.extractUint16(offset);
//     offset += 2;
//     mint.fee = fromFloat(data.extractUint16(offset), Constants.Float16Encoding);
//     offset += 2;
//     mint.amount = data.extractUint96(offset);
//     offset += 12;
//     mint.storageID = data.extractUint32(offset);
//     offset += 4;
//
//     if (mint.type === 0) {
//       mint.nftType = data.extractUint8(offset);
//       offset += 1;
//       mint.tokenAccountID = data.extractUint32(offset);
//       offset += 4;
//       mint.nftID = "0x" + data.extractBytes32(offset).toString("hex");
//       offset += 32;
//       mint.creatorFeeBips = data.extractUint8(offset);
//       offset += 1;
//
//       mint.toAccountID = mint.minterAccountID;
//     } else {
//       mint.toAccountID = data.extractUint32(offset);
//       offset += 4;
//       mint.to = data.extractAddress(offset);
//       offset += 20;
//
//       // Read the following NFT data tx
//       {
//         offset = 68 * 1;
//         const txType = data.extractUint8(offset);
//         assert(txType == TransactionType.NFT_DATA, "unexpected tx type");
//
//         const nftData = NftDataProcessor.extractData(data, offset + 1);
//         mint.nftID = nftData.nftID;
//         mint.creatorFeeBips = nftData.creatorFeeBips;
//       }
//
//       {
//         offset = 68 * 2;
//         const txType = data.extractUint8(offset);
//         assert(txType == TransactionType.NFT_DATA, "unexpected tx type");
//
//         const nftData = NftDataProcessor.extractData(data, offset + 1);
//         assert(nftData.type === 1, "unexpected nft data type");
//         mint.nftType = nftData.nftType;
//         mint.tokenAddress = nftData.tokenAddress;
//       }
//     }
//
//     return mint;
//   }
//
//   public static getNftData(mint: NftMint) {
//     const nftIDHi = new BN(mint.nftID.substr(2, 32), 16).toString(10);
//     const nftIDLo = new BN(mint.nftID.substr(2 + 32, 32), 16).toString(10);
//
//     // Calculate hash
//     const hasher = Poseidon.createHash(7, 6, 52);
//     const inputs = [
//       mint.minter,
//       mint.nftType,
//       mint.tokenAddress,
//       nftIDLo,
//       nftIDHi,
//       mint.creatorFeeBips
//     ];
//     return hasher(inputs).toString(10);
//   }
// }

export function processNFTMint(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.nftMintCount = proxy.nftMintCount.plus(BIGINT_ONE);
  block.nftMintCount = block.nftMintCount.plus(BIGINT_ONE);
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new MintNFT(id);
  transaction.typename = TRANSACTION_NFT_MINT_TYPENAME;
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1; // First byte is tx type

  // Check that this is a conditional update
  transaction.type = extractInt(data, offset, 1);
  offset += 1;

  transaction.minterAccountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.toTokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.feeTokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.fee = extractBigIntFromFloat(data, offset, 2, 5, 11, 10);
  offset += 2;
  transaction.amount = extractBigInt(data, offset, 12);
  offset += 12;
  transaction.storageID = extractInt(data, offset, 4);
  offset += 4;

  if (transaction.type == 0) {
    transaction.nftType = extractInt(data, offset, 1);
    offset += 1;
    transaction.tokenAccountID = extractInt(data, offset, 4);
    offset += 4;
    transaction.nftID = "0x" + extractData(data, offset, 32);
    offset += 32;
    transaction.creatorFeeBips = extractInt(data, offset, 1);
    offset += 1;

    transaction.toAccountID = transaction.minterAccountID;

    let user = User.load(intToString(transaction.tokenAccountID));

    if (user != null) {
      transaction.tokenAddress = user.address.toHexString();
    }
  } else {
    transaction.toAccountID = extractInt(data, offset, 4);
    offset += 4;
    transaction.to = "0x" + extractData(data, offset, 20);
    offset += 20;

    createIfNewAccount(
      transaction.toAccountID,
      transaction.id,
      transaction.to as String,
      proxy
    );
  }

  let accounts = new Array<String>();
  let tokenBalances = new Array<String>();
  let nfts = new Array<String>();
  let slots = new Array<String>();

  transaction.feeToken = intToString(transaction.feeTokenID);

  offset = 68;
  transaction.extraData = extractData(data, offset, 136);
  if (transaction.type != 0) {
    transaction = processNFTData(transaction, block, data, offset);
  }

  accounts.push(intToString(transaction.toAccountID));
  accounts.push(intToString(transaction.minterAccountID));

  let minter = User.load(intToString(transaction.minterAccountID)) as User;

  // Ideally the ID of the NFT should be the Poseidon hash of the NFT DATA, but we don't have support for Poseidon hashing
  let nftID = minter.address
    .toHexString()
    .concat("-")
    .concat(intToString(transaction.nftType))
    .concat("-")
    .concat(transaction.tokenAddress)
    .concat("-")
    .concat(transaction.nftID)
    .concat("-")
    .concat(intToString(transaction.creatorFeeBips));
  let nft = getOrCreateNFT(nftID, transaction.id, proxy);
  nft.minter = intToString(transaction.minterAccountID);
  nft.nftType = transaction.nftType;
  nft.token = transaction.tokenAddress;
  nft.nftID = transaction.nftID;
  nft.creatorFeeBips = transaction.creatorFeeBips;
  nft.save();

  nfts.push(nft.id);

  let receiverAccountNFTSlot = getOrCreateAccountNFTSlot(
    transaction.toAccountID,
    transaction.toTokenID,
    transaction.id
  );
  receiverAccountNFTSlot.nft = nft.id;
  receiverAccountNFTSlot.balance = receiverAccountNFTSlot.balance.plus(
    transaction.amount
  );
  receiverAccountNFTSlot.save();

  slots.push(receiverAccountNFTSlot.id);

  transaction.nft = nft.id;
  transaction.receiverSlot = receiverAccountNFTSlot.id;
  transaction.minter = intToString(transaction.minterAccountID);
  transaction.receiver = intToString(transaction.toAccountID);

  // Minter fee payment
  let minterTokenFeeBalance = getOrCreateAccountTokenBalance(
    intToString(transaction.minterAccountID),
    transaction.feeToken
  );
  minterTokenFeeBalance.balance = minterTokenFeeBalance.balance.minus(
    transaction.fee
  );
  tokenBalances.push(minterTokenFeeBalance.id);

  minterTokenFeeBalance.save();

  // Operator fee payment
  let operatorTokenFeeBalance = getOrCreateAccountTokenBalance(
    intToString(block.operatorAccountID),
    transaction.feeToken
  );
  operatorTokenFeeBalance.balance = operatorTokenFeeBalance.balance.plus(
    transaction.fee
  );
  tokenBalances.push(operatorTokenFeeBalance.id);

  operatorTokenFeeBalance.save();

  transaction.tokenBalances = tokenBalances;
  transaction.accounts = accounts;
  transaction.slots = slots;
  transaction.nfts = nfts;

  getAndUpdateAccountTokenBalanceDailyData(
    minterTokenFeeBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    minterTokenFeeBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    operatorTokenFeeBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    operatorTokenFeeBalance,
    block.timestamp
  );

  transaction.save();
}

function processNFTData(
  transaction: MintNFT,
  block: Block,
  data: String,
  offset: i32
): MintNFT {
  // Read the following NFT data tx
  let firstDataSegment = extractData(data, offset, 68);
  if (firstDataSegment.length == 136) {
    let firstDataSegmentOffset = 0;

    // Get the tx type of the extra data to check that it's an NFTData tx
    let txTypeFirstSegment = extractData(
      firstDataSegment,
      firstDataSegmentOffset,
      1
    );
    firstDataSegmentOffset += 8; // Skips all other NFTData fields that we don't care about

    if (txTypeFirstSegment != TRANSACTION_NFT_DATA) {
      log.warning(
        "First segment of data for mint transaction with ID: {} isn't of type NFTData. Actual type: {}, expected type: {}",
        [transaction.id, txTypeFirstSegment, TRANSACTION_NFT_DATA]
      );
      return transaction as MintNFT;
    }

    transaction.nftID =
      "0x" + extractData(firstDataSegment, firstDataSegmentOffset, 32);
    firstDataSegmentOffset += 32;
    transaction.creatorFeeBips = extractInt(
      firstDataSegment,
      firstDataSegmentOffset,
      1
    );

    offset = 136;
    let secondDataSegment = extractData(data, offset, 68);
    if (secondDataSegment.length == 136) {
      let secondDataSegmentOffset = 0;

      // Get the tx type of the extra data to check that it's an NFTData tx
      let txTypeSecondSegment = extractData(
        secondDataSegment,
        secondDataSegmentOffset,
        1
      );
      secondDataSegmentOffset += 1;

      if (txTypeSecondSegment != TRANSACTION_NFT_DATA) {
        log.warning(
          "Second segment of data for mint transaction with ID: {} isn't of type NFTData. Actual type: {}, expected type: {}",
          [transaction.id, txTypeSecondSegment, TRANSACTION_NFT_DATA]
        );
        return transaction as MintNFT;
      }

      let nftDataTxType = extractInt(data, offset, 1);
      secondDataSegmentOffset += 1 + 4 + 2 + 32 + 1; // Skips all other NFTData fields that we don't care about

      if (nftDataTxType != 1) {
        log.warning(
          "NFTDATA tx type for the second segment is unexpected.",
          []
        );
      }

      transaction.nftType = extractInt(
        secondDataSegment,
        secondDataSegmentOffset,
        1
      );
      secondDataSegmentOffset += 1;
      transaction.tokenAddress =
        "0x" + extractData(secondDataSegment, secondDataSegmentOffset, 20);
      secondDataSegmentOffset += 20;
    }
  }
  return transaction as MintNFT;
}
