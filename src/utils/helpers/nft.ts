import {
  NonFungibleToken,
  AccountNFTSlot,
  Proxy
} from "../../../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { compoundId, intToString, compoundIdToSortableDecimal } from "./util";
import { ZERO_ADDRESS, BIGINT_ZERO, BIGINT_ONE } from "../constants";

export function getOrCreateNFT(
  id: String,
  transactionId: String,
  proxy: Proxy,
  createIfNotFound: boolean = true
): NonFungibleToken {
  let nft = NonFungibleToken.load(id);

  if (nft == null && createIfNotFound) {
    nft = new NonFungibleToken(id);
    nft.mintedAt = compoundIdToSortableDecimal(transactionId);
    nft.mintedAtTransaction = transactionId;

    proxy.nftCount = proxy.nftCount.plus(BIGINT_ONE);
  }

  return nft as NonFungibleToken;
}

export function getOrCreateAccountNFTSlot(
  accountId: i32,
  tokenId: i32,
  transactionId: String,
  createIfNotFound: boolean = true
): AccountNFTSlot {
  let id = compoundId(intToString(accountId), intToString(tokenId));
  let slot = AccountNFTSlot.load(id);

  if (slot == null && createIfNotFound) {
    slot = new AccountNFTSlot(id);
    slot.balance = BIGINT_ZERO;
    slot.account = intToString(accountId);
    slot.createdAt = compoundIdToSortableDecimal(transactionId);
    slot.lastUpdatedAt = compoundIdToSortableDecimal(transactionId);
    slot.createdAtTransaction = transactionId;
    slot.lastUpdatedAtTransaction = transactionId;
  }

  return slot as AccountNFTSlot;
}
