import {
  Swap,
  OrderbookTrade,
  Pair,
  Block,
  Token,
  User,
  Pool,
  Proxy,
  SwapNFT,
  TradeNFT
} from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  extractData,
  extractBigInt,
  extractInt,
  extractBigIntFromFloat,
  stringBytesToI32,
  stringBytesToBigInt
} from "../data";
import {
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  getProtocolAccount,
  getOrCreatePair,
  getAndUpdateTokenDailyData,
  getAndUpdateTokenWeeklyData,
  getAndUpdatePairDailyData,
  getAndUpdatePairWeeklyData,
  calculatePrice,
  compoundIdToSortableDecimal,
  getAndUpdateAccountTokenBalanceDailyData,
  getAndUpdateAccountTokenBalanceWeeklyData,
  getOrCreateAccountNFTSlot
} from "../index";
import {
  BIGINT_ZERO,
  TRANSACTION_AMM_SWAP_TYPENAME,
  TRANSACTION_SWAP_NFT_TYPENAME,
  TRANSACTION_TRADE_NFT_TYPENAME,
  TRANSACTION_ORDERBOOK_TRADE_TYPENAME,
  USER_ACCOUNT_THRESHOLD,
  BIGINT_ONE,
  isNFT
} from "../../constants";

// interface SettlementValues {
//   fillSA: BN;
//   fillBA: BN;
//   feeSA: BN;
//   feeBA: BN;
//   protocolFeeSA: BN;
//   protocolFeeBA: BN;
//
//   fillSB: BN;
//   fillBB: BN;
//   feeSB: BN;
//   feeBB: BN;
//   protocolFeeSB: BN;
//   protocolFeeBB: BN;
// }
//
// /**
//  * Processes spot trade requests.
//  */
// export class SpotTradeProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     data: Bitstream
//   ) {
//     let offset = 1;
//
//     // Storage IDs
//     const storageIdA = data.extractUint32(offset);
//     offset += 4;
//     const storageIdB = data.extractUint32(offset);
//     offset += 4;
//
//     // Accounts
//     const accountIdA = data.extractUint32(offset);
//     offset += 4;
//     const accountIdB = data.extractUint32(offset);
//     offset += 4;
//
//     // Tokens
//     const tokenAS = data.extractUint16(offset);
//     offset += 2;
//     const tokenBS = data.extractUint16(offset);
//     offset += 2;
//
//     // Fills
//     const fFillSA = data.extractUint24(offset);
//     offset += 3;
//     const fFillSB = data.extractUint24(offset);
//     offset += 3;
//
//     // Order data
//     const orderDataA = data.extractUint8(offset);
//     offset += 1;
//     const orderDataB = data.extractUint8(offset);
//     offset += 1;
//
//     // Target tokenIDs
//     let tokenAB = data.extractUint16(offset);
//     offset += 2;
//     let tokenBB = data.extractUint16(offset);
//     offset += 2;
//
//     // Extra fee data
//     let feeBipsHiA = data.extractUint8(offset);
//     offset += 1;
//     let feeBipsHiB = data.extractUint8(offset);
//     offset += 1;
//
//     // Further extraction of packed data
//     const limitMaskA = orderDataA & 0b10000000;
//     const feeBipsA = (feeBipsHiA << 6) | (orderDataA & 0b00111111);
//     const fillAmountBorSA = limitMaskA > 0;
//
//     const limitMaskB = orderDataB & 0b10000000;
//     const feeBipsB = (feeBipsHiB << 6) | (orderDataB & 0b00111111);
//     const fillAmountBorSB = limitMaskB > 0;
//
//     // Decode the float values
//     const fillSA = fromFloat(fFillSA, Constants.Float24Encoding);
//     const fillSB = fromFloat(fFillSB, Constants.Float24Encoding);
//
//     // Decode target tokenIDs
//     tokenAB = tokenAB !== 0 ? tokenAB : tokenBS;
//     tokenBB = tokenBB !== 0 ? tokenBB : tokenAS;
//
//     const s = this.calculateSettlementValues(
//       tokenAS,
//       tokenBS,
//       block.protocolFeeTakerBips,
//       block.protocolFeeMakerBips,
//       fillSA,
//       fillSB,
//       feeBipsA,
//       feeBipsB
//     );
//
//     // Update accountA
//     {
//       const accountA = state.getAccount(accountIdA);
//       accountA
//         .getBalance(tokenAS)
//         .balance.isub(s.fillSA)
//         .isub(s.feeSA);
//       accountA
//         .getBalance(tokenAB)
//         .balance.iadd(s.fillBA)
//         .isub(s.feeBA);
//
//       const tradeHistoryA = accountA.getBalance(tokenAS).getStorage(storageIdA);
//       if (tradeHistoryA.storageID !== storageIdA) {
//         tradeHistoryA.data = new BN(0);
//       }
//       tradeHistoryA.storageID = storageIdA;
//       tradeHistoryA.data.iadd(fillAmountBorSA ? s.fillBA : s.fillSA);
//
//       if (Constants.isNFT(tokenAS)) {
//         const accountB = state.getAccount(accountIdB);
//         const nftData = accountA.getBalance(tokenAS).weightAMM;
//         if (accountA.getBalance(tokenAS).balance.eq(new BN(0))) {
//           accountA.getBalance(tokenAS).weightAMM = new BN(0);
//         }
//         accountB.getBalance(tokenBB).weightAMM = nftData;
//       }
//     }
//     // Update accountB
//     {
//       const accountB = state.getAccount(accountIdB);
//       accountB
//         .getBalance(tokenBS)
//         .balance.isub(s.fillSB)
//         .isub(s.feeSB);
//       accountB
//         .getBalance(tokenBB)
//         .balance.iadd(s.fillBB)
//         .isub(s.feeBB);
//
//       const tradeHistoryB = accountB.getBalance(tokenBS).getStorage(storageIdB);
//       if (tradeHistoryB.storageID !== storageIdB) {
//         tradeHistoryB.data = new BN(0);
//       }
//       tradeHistoryB.storageID = storageIdB;
//       tradeHistoryB.data.iadd(fillAmountBorSB ? s.fillBB : s.fillSB);
//
//       if (Constants.isNFT(tokenBS)) {
//         const accountA = state.getAccount(accountIdA);
//         const nftData = accountB.getBalance(tokenBS).weightAMM;
//         if (accountB.getBalance(tokenBS).balance.eq(new BN(0))) {
//           accountB.getBalance(tokenBS).weightAMM = new BN(0);
//         }
//         accountA.getBalance(tokenAB).weightAMM = nftData;
//       }
//     }
//
//     // Update protocol fee
//     const protocol = state.getAccount(0);
//     protocol
//       .getBalance(tokenAS)
//       .balance.iadd(s.protocolFeeSA)
//       .iadd(s.protocolFeeBB);
//     protocol
//       .getBalance(tokenBS)
//       .balance.iadd(s.protocolFeeBA)
//       .iadd(s.protocolFeeSB);
//
//     // Update operator
//     const operator = state.getAccount(block.operatorAccountID);
//     operator
//       .getBalance(tokenAS)
//       .balance.iadd(s.feeSA)
//       .iadd(s.feeBB)
//       .isub(s.protocolFeeSA)
//       .isub(s.protocolFeeBB);
//     operator
//       .getBalance(tokenBS)
//       .balance.iadd(s.feeBA)
//       .iadd(s.feeSB)
//       .isub(s.protocolFeeBA)
//       .isub(s.protocolFeeSB);
//
//     // Create struct
//     const trade: SpotTrade = {
//       exchange: state.exchange,
//       requestIdx: state.processedRequests.length,
//       blockIdx: /*block.blockIdx*/ 0,
//
//       accountIdA,
//       orderIdA: storageIdA,
//       fillAmountBorSA,
//       tokenAS,
//       tokenAB,
//       fillSA: s.fillSA,
//       feeA: s.feeBA,
//       protocolFeeA: s.protocolFeeBA,
//
//       accountIdB,
//       orderIdB: storageIdB,
//       fillAmountBorSB,
//       tokenBS,
//       tokenBB,
//       fillSB: s.fillSB,
//       feeB: s.feeBB,
//       protocolFeeB: s.protocolFeeBB
//     };
//
//     return trade;
//   }
//
//   private static calculateSettlementValues(
//     tokenAS: number,
//     tokenBS: number,
//     protocolFeeTakerBips: number,
//     protocolFeeMakerBips: number,
//     fillSA: BN,
//     fillSB: BN,
//     feeBipsA: number,
//     feeBipsB: number
//   ) {
//     const fillBA = fillSB;
//     const fillBB = fillSA;
//
//     const feeBipsSA = !Constants.isNFT(tokenBS) ? 0 : feeBipsA;
//     const feeBipsBA = !Constants.isNFT(tokenBS) ? feeBipsA : 0;
//     const feeBipsSB = !Constants.isNFT(tokenAS) ? 0 : feeBipsB;
//     const feeBipsBB = !Constants.isNFT(tokenAS) ? feeBipsB : 0;
//
//     const allNFT = Constants.isNFT(tokenAS) && Constants.isNFT(tokenBS);
//     const _protocolTakerFeeBips = allNFT ? 0 : protocolFeeTakerBips;
//     const _protocolMakerFeeBips = allNFT ? 0 : protocolFeeMakerBips;
//     const protocolFeeBipsSA = !Constants.isNFT(tokenBS)
//       ? 0
//       : _protocolTakerFeeBips;
//     const protocolFeeBipsBA = !Constants.isNFT(tokenBS)
//       ? _protocolTakerFeeBips
//       : 0;
//     const protocolFeeBipsSB = !Constants.isNFT(tokenAS)
//       ? 0
//       : _protocolMakerFeeBips;
//     const protocolFeeBipsBB = !Constants.isNFT(tokenAS)
//       ? _protocolMakerFeeBips
//       : 0;
//
//     const [feeSA, protocolFeeSA] = this.calculateFees(
//       fillSA,
//       protocolFeeBipsSA,
//       feeBipsSA
//     );
//     const [feeBA, protocolFeeBA] = this.calculateFees(
//       fillBA,
//       protocolFeeBipsBA,
//       feeBipsBA
//     );
//     const [feeSB, protocolFeeSB] = this.calculateFees(
//       fillSB,
//       protocolFeeBipsSB,
//       feeBipsSB
//     );
//     const [feeBB, protocolFeeBB] = this.calculateFees(
//       fillBB,
//       protocolFeeBipsBB,
//       feeBipsBB
//     );
//
//     const settlementValues: SettlementValues = {
//       fillSA,
//       fillBA,
//       feeSA,
//       feeBA,
//       protocolFeeSA,
//       protocolFeeBA,
//
//       fillSB,
//       fillBB,
//       feeSB,
//       feeBB,
//       protocolFeeSB,
//       protocolFeeBB
//     };
//     return settlementValues;
//   }
//
//   private static calculateFees(
//     fillB: BN,
//     protocolFeeBips: number,
//     feeBips: number
//   ) {
//     const protocolFee = fillB.mul(new BN(protocolFeeBips)).div(new BN(100000));
//     const fee = fillB.mul(new BN(feeBips)).div(new BN(10000));
//     return [fee, protocolFee];
//   }
// }

export function processSpotTrade(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new OrderbookTrade(id);
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1;

  // Storage IDs
  transaction.storageIdA = extractInt(data, offset, 4);
  offset += 4;
  transaction.storageIdB = extractInt(data, offset, 4);
  offset += 4;

  // Accounts
  transaction.accountIdA = extractInt(data, offset, 4);
  offset += 4;
  transaction.accountIdB = extractInt(data, offset, 4);
  offset += 4;

  // Tokens
  transaction.tokenIDAS = extractInt(data, offset, 2);
  offset += 2;
  transaction.tokenIDBS = extractInt(data, offset, 2);
  offset += 2;

  // Fills
  transaction.fFillSA = extractInt(data, offset, 3);
  transaction.fillSA = extractBigIntFromFloat(data, offset, 3, 5, 19, 10);
  offset += 3;
  transaction.fFillSB = extractInt(data, offset, 3);
  transaction.fillSB = extractBigIntFromFloat(data, offset, 3, 5, 19, 10);
  offset += 3;

  // Order data
  transaction.orderDataA = extractBigInt(data, offset, 1);
  offset += 1;
  transaction.orderDataB = extractBigInt(data, offset, 1);
  offset += 1;

  // Target tokenIDs
  transaction.tokenIDAB = extractInt(data, offset, 2);
  offset += 2;
  transaction.tokenIDBB = extractInt(data, offset, 2);
  offset += 2;

  // Extra fee data
  transaction.feeBipsHiA = extractBigInt(data, offset, 1);
  offset += 1;
  transaction.feeBipsHiB = extractBigInt(data, offset, 1);
  offset += 1;

  // There's no need to create the accounts, they don't need to be updated
  // and they can't be created first during a SpotTrade transaction.
  let accountAID = intToString(transaction.accountIdA);
  let accountBID = intToString(transaction.accountIdB);

  let tokenBalances = new Array<String>();
  let accounts = new Array<String>();
  accounts.push(accountAID);
  accounts.push(accountBID);

  let tokenIDAS = transaction.tokenIDAS;
  let tokenIDBS = transaction.tokenIDBS;

  // Further extraction of packed data
  transaction.limitMaskA = transaction.orderDataA & stringBytesToBigInt("80");
  transaction.feeBipsA =
    (transaction.feeBipsHiA << 6) |
    (transaction.orderDataA & stringBytesToBigInt("3F"));
  transaction.fillAmountBorSA = transaction.limitMaskA > BIGINT_ZERO;

  transaction.limitMaskB = transaction.orderDataB & stringBytesToBigInt("80");
  transaction.feeBipsB =
    (transaction.feeBipsHiB << 6) |
    (transaction.orderDataB & stringBytesToBigInt("3F"));
  transaction.fillAmountBorSB = transaction.limitMaskB > BIGINT_ZERO;

  // settlement values
  transaction.fillBA = transaction.fillSB;
  transaction.fillBB = transaction.fillSA;

  if (isNFT(tokenIDAS) || isNFT(tokenIDBS)) {
    // NFT trade/swap
    let nfts = new Array<String>();
    let slots = new Array<String>();

    let tokenIDAB =
      transaction.tokenIDAB != 0
        ? transaction.tokenIDAB
        : transaction.tokenIDAS;
    let tokenIDBB =
      transaction.tokenIDBB != 0
        ? transaction.tokenIDBB
        : transaction.tokenIDBS;

    // Check whether it's a swap or a trade
    if (isNFT(tokenIDAS) && isNFT(tokenIDBS)) {
      let coercedTransaction = changetype<SwapNFT>(transaction);
      coercedTransaction.typename = TRANSACTION_SWAP_NFT_TYPENAME;
      proxy.swapNFTCount = proxy.swapNFTCount.plus(BIGINT_ONE);
      block.swapNFTCount = block.swapNFTCount.plus(BIGINT_ONE);

      let slotASeller = getOrCreateAccountNFTSlot(
        coercedTransaction.accountIdA,
        tokenIDAS,
        coercedTransaction.id
      );
      let slotBSeller = getOrCreateAccountNFTSlot(
        coercedTransaction.accountIdB,
        tokenIDBS,
        coercedTransaction.id
      );
      let slotABuyer = getOrCreateAccountNFTSlot(
        coercedTransaction.accountIdA,
        tokenIDAB,
        coercedTransaction.id
      );
      let slotBBuyer = getOrCreateAccountNFTSlot(
        coercedTransaction.accountIdB,
        tokenIDBB,
        coercedTransaction.id
      );

      slots.push(slotASeller.id);
      slots.push(slotBSeller.id);
      slots.push(slotABuyer.id);
      slots.push(slotBBuyer.id);

      // A buy and B sell
      slotABuyer.balance = slotABuyer.balance.plus(coercedTransaction.fillSB);
      slotABuyer.nft = slotBSeller.nft;

      nfts.push(slotABuyer.nft as String);

      slotBSeller.balance = slotBSeller.balance.minus(
        coercedTransaction.fillSB
      );
      if (slotBSeller.balance <= BIGINT_ZERO) {
        slotBSeller.nft = null;
      }

      // B buy and A sell
      slotBBuyer.balance = slotBBuyer.balance.plus(coercedTransaction.fillSA);
      slotBBuyer.nft = slotASeller.nft;

      nfts.push(slotBBuyer.nft as String);

      slotASeller.balance = slotASeller.balance.minus(
        coercedTransaction.fillSA
      );
      if (slotASeller.balance <= BIGINT_ZERO) {
        slotASeller.nft = null;
      }

      slotBBuyer.save();
      slotASeller.save();

      coercedTransaction.slotABuyer = slotABuyer.id;
      coercedTransaction.slotBBuyer = slotBBuyer.id;
      coercedTransaction.slotASeller = slotASeller.id;
      coercedTransaction.slotBSeller = slotBSeller.id;

      coercedTransaction.accountA = accountAID;
      coercedTransaction.accountB = accountBID;

      coercedTransaction.tokenBalances = tokenBalances;
      coercedTransaction.accounts = accounts;
      coercedTransaction.nfts = nfts;
      coercedTransaction.slots = slots;

      coercedTransaction.save();
      // There's no fees on swap nfts
    } else {
      let coercedTransaction = changetype<TradeNFT>(transaction);
      coercedTransaction.typename = TRANSACTION_TRADE_NFT_TYPENAME;
      proxy.tradeNFTCount = proxy.tradeNFTCount.plus(BIGINT_ONE);
      block.tradeNFTCount = block.tradeNFTCount.plus(BIGINT_ONE);

      let sellerId = isNFT(tokenIDAS)
        ? coercedTransaction.accountIdA
        : coercedTransaction.accountIdB;
      let buyerId = isNFT(tokenIDAS)
        ? coercedTransaction.accountIdB
        : coercedTransaction.accountIdA;
      let sellerFeeBips = isNFT(tokenIDAS)
        ? coercedTransaction.feeBipsA
        : coercedTransaction.feeBipsB;
      let sellerProtocolFeeBips = isNFT(tokenIDAS)
        ? block.protocolFeeTakerBips
        : block.protocolFeeMakerBips;
      let buyerFeeBips = isNFT(tokenIDAS)
        ? coercedTransaction.feeBipsB
        : coercedTransaction.feeBipsA;
      let buyerProtocolFeeBips = isNFT(tokenIDAS)
        ? block.protocolFeeMakerBips
        : block.protocolFeeTakerBips;
      let slotIdSeller = isNFT(tokenIDAS) ? tokenIDAS : tokenIDBS;
      let slotIdBuyer = isNFT(tokenIDAS) ? tokenIDBB : tokenIDAB;
      let tokenId = isNFT(tokenIDAS) ? tokenIDBS : tokenIDAS;
      let amountNFT = isNFT(tokenIDAS)
        ? coercedTransaction.fillSA
        : coercedTransaction.fillSB;
      let amountToken = isNFT(tokenIDAS)
        ? coercedTransaction.fillSB
        : coercedTransaction.fillSA;

      coercedTransaction.accountSeller = intToString(sellerId);
      coercedTransaction.accountBuyer = intToString(buyerId);

      // NFT slot transfer
      let slotSeller = getOrCreateAccountNFTSlot(
        sellerId,
        slotIdSeller,
        coercedTransaction.id
      );
      let slotBuyer = getOrCreateAccountNFTSlot(
        buyerId,
        slotIdBuyer,
        coercedTransaction.id
      );

      slots.push(slotSeller.id);
      slots.push(slotBuyer.id);

      slotBuyer.balance = slotBuyer.balance.plus(amountNFT);
      slotBuyer.nft = slotSeller.nft;

      nfts.push(slotBuyer.nft as String);

      slotSeller.balance = slotSeller.balance.minus(amountNFT);
      if (slotSeller.balance <= BIGINT_ZERO) {
        slotSeller.nft = null;
      }

      slotBuyer.save();
      slotSeller.save();

      coercedTransaction.slotBuyer = slotBuyer.id;
      coercedTransaction.slotSeller = slotSeller.id;

      // ERC20 payment of the NFT trade
      // TO-DO fees and token balance updates
      let token = getToken(intToString(tokenId)) as Token;
      coercedTransaction.token = token.id;
      coercedTransaction.realizedNFTPrice = amountToken;

      coercedTransaction.feeSeller = calculateFee(amountToken, sellerFeeBips);
      coercedTransaction.protocolFeeSeller = calculateProtocolFee(
        amountToken,
        sellerProtocolFeeBips
      );

      coercedTransaction.feeBuyer = calculateFee(amountToken, buyerFeeBips);
      coercedTransaction.protocolFeeBuyer = calculateProtocolFee(
        amountToken,
        buyerProtocolFeeBips
      );

      let accountTokenBalanceSeller = getOrCreateAccountTokenBalance(
        intToString(sellerId),
        token.id
      );
      accountTokenBalanceSeller.balance = accountTokenBalanceSeller.balance
        .plus(amountToken)
        .minus(coercedTransaction.feeSeller);
      accountTokenBalanceSeller.save();
      tokenBalances.push(accountTokenBalanceSeller.id);

      let accountTokenBalanceBuyer = getOrCreateAccountTokenBalance(
        intToString(buyerId),
        token.id
      );
      accountTokenBalanceBuyer.balance = accountTokenBalanceBuyer.balance
        .minus(amountToken)
        .minus(coercedTransaction.feeBuyer);
      accountTokenBalanceBuyer.save();
      tokenBalances.push(accountTokenBalanceBuyer.id);

      // Should also update operator account balance
      let operatorId = intToString(block.operatorAccountID);

      let operatorTokenBalance = getOrCreateAccountTokenBalance(
        operatorId,
        token.id
      );
      operatorTokenBalance.balance = operatorTokenBalance.balance
        .plus(coercedTransaction.feeBuyer)
        .plus(coercedTransaction.feeSeller)
        .minus(coercedTransaction.protocolFeeBuyer)
        .minus(coercedTransaction.protocolFeeSeller);
      operatorTokenBalance.save();
      tokenBalances.push(operatorTokenBalance.id);

      // update protocol balance
      let protocolAccount = getProtocolAccount(coercedTransaction.id);

      let protocolTokenBalance = getOrCreateAccountTokenBalance(
        protocolAccount.id,
        token.id
      );
      protocolTokenBalance.balance = protocolTokenBalance.balance
        .plus(coercedTransaction.protocolFeeSeller)
        .plus(coercedTransaction.protocolFeeBuyer);
      protocolTokenBalance.save();
      tokenBalances.push(protocolTokenBalance.id);

      coercedTransaction.tokenBalances = tokenBalances;
      coercedTransaction.accounts = accounts;
      coercedTransaction.slots = slots;
      coercedTransaction.nfts = nfts;

      coercedTransaction.save();
      protocolAccount.save();
    }
  } else {
    // ERC20 trade/swap

    let tokenA = getToken(intToString(tokenIDAS)) as Token;
    let tokenB = getToken(intToString(tokenIDBS)) as Token;

    transaction.tokenA = tokenA.id;
    transaction.tokenB = tokenB.id;

    transaction.feeA = calculateFee(transaction.fillBA, transaction.feeBipsA);
    transaction.protocolFeeA = calculateProtocolFee(
      transaction.fillBA,
      block.protocolFeeTakerBips
    );

    transaction.feeB = calculateFee(transaction.fillBB, transaction.feeBipsB);
    transaction.protocolFeeB = calculateProtocolFee(
      transaction.fillBB,
      block.protocolFeeMakerBips
    );

    // Update token balances for account A
    let accountTokenBalanceAA = getOrCreateAccountTokenBalance(
      accountAID,
      tokenA.id
    );
    accountTokenBalanceAA.balance = accountTokenBalanceAA.balance.minus(
      transaction.fillSA
    );
    accountTokenBalanceAA.save();
    tokenBalances.push(accountTokenBalanceAA.id);

    let accountTokenBalanceAB = getOrCreateAccountTokenBalance(
      accountAID,
      tokenB.id
    );
    accountTokenBalanceAB.balance = accountTokenBalanceAB.balance
      .plus(transaction.fillBA)
      .minus(transaction.feeA);
    accountTokenBalanceAB.save();
    tokenBalances.push(accountTokenBalanceAB.id);

    // Update token balances for account B
    let accountTokenBalanceBB = getOrCreateAccountTokenBalance(
      accountBID,
      tokenB.id
    );
    accountTokenBalanceBB.balance = accountTokenBalanceBB.balance.minus(
      transaction.fillSB
    );
    accountTokenBalanceBB.save();
    tokenBalances.push(accountTokenBalanceBB.id);

    let accountTokenBalanceBA = getOrCreateAccountTokenBalance(
      accountBID,
      tokenA.id
    );
    accountTokenBalanceBA.balance = accountTokenBalanceBA.balance
      .plus(transaction.fillBB)
      .minus(transaction.feeB);
    accountTokenBalanceBA.save();
    tokenBalances.push(accountTokenBalanceBA.id);

    // Should also update operator account balance
    let operatorId = intToString(block.operatorAccountID);

    let operatorTokenBalanceA = getOrCreateAccountTokenBalance(
      operatorId,
      tokenA.id
    );
    operatorTokenBalanceA.balance = operatorTokenBalanceA.balance
      .plus(transaction.feeB)
      .minus(transaction.protocolFeeB);
    operatorTokenBalanceA.save();
    tokenBalances.push(operatorTokenBalanceA.id);

    let operatorTokenBalanceB = getOrCreateAccountTokenBalance(
      operatorId,
      tokenB.id
    );
    operatorTokenBalanceB.balance = operatorTokenBalanceB.balance
      .plus(transaction.feeA)
      .minus(transaction.protocolFeeA);
    operatorTokenBalanceB.save();
    tokenBalances.push(operatorTokenBalanceB.id);

    // update protocol balance
    let protocolAccount = getProtocolAccount(transaction.id);

    let protocolTokenBalanceA = getOrCreateAccountTokenBalance(
      protocolAccount.id,
      tokenA.id
    );
    protocolTokenBalanceA.balance = protocolTokenBalanceA.balance.plus(
      transaction.protocolFeeB
    );
    protocolTokenBalanceA.save();
    tokenBalances.push(protocolTokenBalanceA.id);

    let protocolTokenBalanceB = getOrCreateAccountTokenBalance(
      protocolAccount.id,
      tokenB.id
    );
    protocolTokenBalanceB.balance = protocolTokenBalanceB.balance.plus(
      transaction.protocolFeeA
    );
    protocolTokenBalanceB.save();
    tokenBalances.push(protocolTokenBalanceB.id);

    // Update pair info
    transaction.tokenAPrice = calculatePrice(
      tokenA as Token,
      transaction.fillSA,
      transaction.fillSB
    );
    transaction.tokenBPrice = calculatePrice(
      tokenB as Token,
      transaction.fillSB,
      transaction.fillSA
    );

    let pair = getOrCreatePair(tokenIDAS, tokenIDBS);

    let token0Price =
      tokenIDAS < tokenIDBS ? transaction.tokenAPrice : transaction.tokenBPrice;
    let token1Price =
      tokenIDAS < tokenIDBS ? transaction.tokenBPrice : transaction.tokenAPrice;
    let token0Amount =
      tokenIDAS < tokenIDBS ? transaction.fillSA : transaction.fillSB;
    let token1Amount =
      tokenIDAS < tokenIDBS ? transaction.fillSB : transaction.fillSA;

    pair.token0Price = token0Price;
    pair.token1Price = token1Price;
    pair.tradedVolumeToken0 = pair.tradedVolumeToken0.plus(token0Amount);
    pair.tradedVolumeToken1 = pair.tradedVolumeToken1.plus(token1Amount);

    tokenA.tradedVolume = tokenA.tradedVolume.plus(transaction.fillSA);
    tokenB.tradedVolume = tokenB.tradedVolume.plus(transaction.fillSB);

    transaction.pair = pair.id;

    let tokenADailyData = getAndUpdateTokenDailyData(
      tokenA as Token,
      block.timestamp
    );
    let tokenAWeeklyData = getAndUpdateTokenWeeklyData(
      tokenA as Token,
      block.timestamp
    );
    let tokenBDailyData = getAndUpdateTokenDailyData(
      tokenB as Token,
      block.timestamp
    );
    let tokenBWeeklyData = getAndUpdateTokenWeeklyData(
      tokenB as Token,
      block.timestamp
    );
    let pairDailyData = getAndUpdatePairDailyData(
      pair as Pair,
      token0Amount,
      token1Amount,
      block.timestamp
    );
    let pairWeeklyData = getAndUpdatePairWeeklyData(
      pair as Pair,
      token0Amount,
      token1Amount,
      block.timestamp
    );

    tokenADailyData.tradedVolume = tokenADailyData.tradedVolume.plus(
      transaction.fillSA
    );
    tokenAWeeklyData.tradedVolume = tokenAWeeklyData.tradedVolume.plus(
      transaction.fillSA
    );
    tokenBDailyData.tradedVolume = tokenBDailyData.tradedVolume.plus(
      transaction.fillSB
    );
    tokenBWeeklyData.tradedVolume = tokenBWeeklyData.tradedVolume.plus(
      transaction.fillSB
    );

    transaction.tokenBalances = tokenBalances;
    transaction.accounts = accounts;

    // Coerce the type of the Trade at the end, so we can reuse most of the code with no changes.
    // This could be a lot cleaner if we could use interfaces in AssemblyScript
    // After that we also need to update the breakdowns for every statistic we track
    // on the various core, daily and weekly entities.
    if (
      transaction.accountIdA < USER_ACCOUNT_THRESHOLD ||
      transaction.accountIdB < USER_ACCOUNT_THRESHOLD
    ) {
      proxy.swapCount = proxy.swapCount.plus(BIGINT_ONE);
      block.swapCount = block.swapCount.plus(BIGINT_ONE);

      let coercedTransaction = changetype<Swap>(transaction);
      coercedTransaction.pool =
        transaction.accountIdA < transaction.accountIdB
          ? accountAID
          : accountBID;
      coercedTransaction.account =
        transaction.accountIdA < transaction.accountIdB
          ? accountBID
          : accountAID;
      coercedTransaction.typename = TRANSACTION_AMM_SWAP_TYPENAME;
      coercedTransaction.save();

      tokenADailyData.tradedVolumeSwap = tokenADailyData.tradedVolumeSwap.plus(
        transaction.fillSA
      );
      tokenAWeeklyData.tradedVolumeSwap = tokenAWeeklyData.tradedVolumeSwap.plus(
        transaction.fillSA
      );
      tokenBDailyData.tradedVolumeSwap = tokenBDailyData.tradedVolumeSwap.plus(
        transaction.fillSB
      );
      tokenBWeeklyData.tradedVolumeSwap = tokenBWeeklyData.tradedVolumeSwap.plus(
        transaction.fillSB
      );

      tokenA.tradedVolumeSwap = tokenA.tradedVolumeSwap.plus(
        transaction.fillSA
      );
      tokenB.tradedVolumeSwap = tokenB.tradedVolumeSwap.plus(
        transaction.fillSB
      );

      pairDailyData.tradedVolumeToken0Swap = pairDailyData.tradedVolumeToken0Swap.plus(
        token0Amount
      );
      pairDailyData.tradedVolumeToken1Swap = pairDailyData.tradedVolumeToken1Swap.plus(
        token1Amount
      );
      pairWeeklyData.tradedVolumeToken0Swap = pairWeeklyData.tradedVolumeToken0Swap.plus(
        token0Amount
      );
      pairWeeklyData.tradedVolumeToken1Swap = pairWeeklyData.tradedVolumeToken1Swap.plus(
        token1Amount
      );

      pair.tradedVolumeToken0Swap = pair.tradedVolumeToken0Swap.plus(
        token0Amount
      );
      pair.tradedVolumeToken1Swap = pair.tradedVolumeToken1Swap.plus(
        token1Amount
      );
    } else {
      proxy.orderbookTradeCount = proxy.orderbookTradeCount.plus(BIGINT_ONE);
      block.orderbookTradeCount = block.orderbookTradeCount.plus(BIGINT_ONE);

      transaction.accountA = accountAID;
      transaction.accountB = accountBID;
      transaction.typename = TRANSACTION_ORDERBOOK_TRADE_TYPENAME;
      transaction.save();

      tokenADailyData.tradedVolumeOrderbook = tokenADailyData.tradedVolumeOrderbook.plus(
        transaction.fillSA
      );
      tokenAWeeklyData.tradedVolumeOrderbook = tokenAWeeklyData.tradedVolumeOrderbook.plus(
        transaction.fillSA
      );
      tokenBDailyData.tradedVolumeOrderbook = tokenBDailyData.tradedVolumeOrderbook.plus(
        transaction.fillSB
      );
      tokenBWeeklyData.tradedVolumeOrderbook = tokenBWeeklyData.tradedVolumeOrderbook.plus(
        transaction.fillSB
      );

      tokenA.tradedVolumeOrderbook = tokenA.tradedVolumeOrderbook.plus(
        transaction.fillSA
      );
      tokenB.tradedVolumeOrderbook = tokenB.tradedVolumeOrderbook.plus(
        transaction.fillSB
      );

      pairDailyData.tradedVolumeToken0Orderbook = pairDailyData.tradedVolumeToken0Orderbook.plus(
        token0Amount
      );
      pairDailyData.tradedVolumeToken1Orderbook = pairDailyData.tradedVolumeToken1Orderbook.plus(
        token1Amount
      );
      pairWeeklyData.tradedVolumeToken0Orderbook = pairWeeklyData.tradedVolumeToken0Orderbook.plus(
        token0Amount
      );
      pairWeeklyData.tradedVolumeToken1Orderbook = pairWeeklyData.tradedVolumeToken1Orderbook.plus(
        token1Amount
      );

      pair.tradedVolumeToken0Orderbook = pair.tradedVolumeToken0Orderbook.plus(
        token0Amount
      );
      pair.tradedVolumeToken1Orderbook = pair.tradedVolumeToken1Orderbook.plus(
        token1Amount
      );
    }

    getAndUpdateAccountTokenBalanceDailyData(
      accountTokenBalanceAA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      accountTokenBalanceAA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      accountTokenBalanceAB,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      accountTokenBalanceAB,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      accountTokenBalanceBB,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      accountTokenBalanceBB,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      accountTokenBalanceBA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      accountTokenBalanceBA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      operatorTokenBalanceA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      operatorTokenBalanceA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      operatorTokenBalanceB,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      operatorTokenBalanceB,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      protocolTokenBalanceA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      protocolTokenBalanceA,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      protocolTokenBalanceB,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      protocolTokenBalanceB,
      block.timestamp
    );

    pairDailyData.save();
    pairWeeklyData.save();
    tokenADailyData.save();
    tokenAWeeklyData.save();
    tokenBDailyData.save();
    tokenBWeeklyData.save();
    tokenA.save();
    tokenB.save();
    pair.save();
    protocolAccount.save();
  }
}

function calculateFee(fillB: BigInt, feeBips: BigInt): BigInt {
  return fillB.times(feeBips).div(BigInt.fromI32(10000));
}

function calculateProtocolFee(fillB: BigInt, protocolFeeBips: i32): BigInt {
  return fillB
    .times(BigInt.fromI32(protocolFeeBips))
    .div(BigInt.fromI32(100000));
}
