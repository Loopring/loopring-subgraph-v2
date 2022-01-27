import {
  Proxy,
  Pool,
  User,
  AccountTokenBalance,
  ProtocolAccount,
  AccountTokenBalanceDailyData,
  AccountTokenBalanceWeeklyData
} from "../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { compoundId, intToString, compoundIdToSortableDecimal } from "./util";
import {
  ZERO_ADDRESS,
  BIGINT_ZERO,
  BIGINT_ONE,
  USER_ACCOUNT_THRESHOLD,
  SECONDS_PER_DAY,
  LAUNCH_DAY,
  SECONDS_PER_WEEK,
  LAUNCH_WEEK,
  WEEK_OFFSET
} from "../constants";

export function getOrCreateUser(
  id: String,
  transactionId: String,
  addressString: String,
  proxy: Proxy,
  createIfNotFound: boolean = true
): User {
  let user = User.load(id);

  if (user == null && createIfNotFound) {
    user = new User(id);
    user.internalID = BigInt.fromString(id);
    user.createdAt = compoundIdToSortableDecimal(transactionId);
    user.lastUpdatedAt = compoundIdToSortableDecimal(transactionId);
    user.createdAtTransaction = transactionId;
    user.lastUpdatedAtTransaction = transactionId;
    user.address = Address.fromString(addressString) as Bytes;

    user.save();

    proxy.userCount = proxy.userCount + BIGINT_ONE;
  }

  return user as User;
}

export function getOrCreatePool(
  id: String,
  transactionId: String,
  addressString: String,
  proxy: Proxy,
  createIfNotFound: boolean = true
): Pool {
  let pool = Pool.load(id);

  if (pool == null && createIfNotFound) {
    pool = new Pool(id);
    pool.internalID = BigInt.fromString(id);
    pool.createdAt = compoundIdToSortableDecimal(transactionId);
    pool.lastUpdatedAt = compoundIdToSortableDecimal(transactionId);
    pool.createdAtTransaction = transactionId;
    pool.lastUpdatedAtTransaction = transactionId;
    pool.address = Address.fromString(addressString) as Bytes;

    pool.save();

    proxy.poolCount = proxy.poolCount + BIGINT_ONE;
  }

  return pool as Pool;
}

export function getOrCreateAccountTokenBalance(
  accountId: String,
  tokenId: String,
  createIfNotFound: boolean = true
): AccountTokenBalance {
  let id = compoundId(accountId, tokenId);
  let balance = AccountTokenBalance.load(id);

  if (balance == null && createIfNotFound) {
    balance = new AccountTokenBalance(id);
    balance.balance = BigInt.fromI32(0);
    balance.account = accountId;
    balance.token = tokenId;
  }

  return balance as AccountTokenBalance;
}

export function getAndUpdateAccountTokenBalanceDailyData(
  entity: AccountTokenBalance,
  timestamp: BigInt
): AccountTokenBalanceDailyData {
  let dayId = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY;
  let id = compoundId(entity.id, BigInt.fromI32(dayId).toString());
  let dailyData = AccountTokenBalanceDailyData.load(id);

  if (dailyData == null) {
    dailyData = new AccountTokenBalanceDailyData(id);

    dailyData.dayStart = BigInt.fromI32(
      (timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY
    );
    dailyData.dayEnd = dailyData.dayStart + BigInt.fromI32(SECONDS_PER_DAY);
    dailyData.dayNumber = dayId;
    dailyData.account = entity.account;
    dailyData.token = entity.token;
    dailyData.accountTokenBalance = entity.id;
    dailyData.balance = entity.balance;
    dailyData.balanceOpen = entity.balance;
    dailyData.balanceClose = entity.balance;
    dailyData.balanceLow = entity.balance;
    dailyData.balanceHigh = entity.balance;
  }

  dailyData.balance = entity.balance;
  dailyData.balanceClose = entity.balance;
  if (entity.balance > dailyData.balanceHigh) {
    dailyData.balanceHigh = entity.balance;
  } else if (entity.balance < dailyData.balanceLow) {
    dailyData.balanceLow = entity.balance;
  }
  dailyData.save();

  return dailyData as AccountTokenBalanceDailyData;
}

export function getAndUpdateAccountTokenBalanceWeeklyData(
  entity: AccountTokenBalance,
  timestamp: BigInt
): AccountTokenBalanceWeeklyData {
  let weekId = timestamp.toI32() / SECONDS_PER_WEEK - LAUNCH_WEEK;
  let id = compoundId(entity.id, BigInt.fromI32(weekId).toString());
  let weeklyData = AccountTokenBalanceWeeklyData.load(id);

  if (weeklyData == null) {
    weeklyData = new AccountTokenBalanceWeeklyData(id);

    weeklyData.weekStart = BigInt.fromI32(
      (timestamp.toI32() / SECONDS_PER_WEEK) * SECONDS_PER_WEEK - WEEK_OFFSET
    );
    weeklyData.weekEnd =
      weeklyData.weekStart + BigInt.fromI32(SECONDS_PER_WEEK);
    weeklyData.weekNumber = weekId;
    weeklyData.account = entity.account;
    weeklyData.token = entity.token;
    weeklyData.accountTokenBalance = entity.id;
    weeklyData.balance = entity.balance;
    weeklyData.balanceOpen = entity.balance;
    weeklyData.balanceClose = entity.balance;
    weeklyData.balanceLow = entity.balance;
    weeklyData.balanceHigh = entity.balance;
  }

  weeklyData.balance = entity.balance;
  weeklyData.balanceClose = entity.balance;
  if (entity.balance > weeklyData.balanceHigh) {
    weeklyData.balanceHigh = entity.balance;
  } else if (entity.balance < weeklyData.balanceLow) {
    weeklyData.balanceLow = entity.balance;
  }
  weeklyData.save();

  return weeklyData as AccountTokenBalanceWeeklyData;
}

export function getProtocolAccount(transactionId: String): ProtocolAccount {
  let account = ProtocolAccount.load("0");

  if (account == null) {
    account = new ProtocolAccount("0");
    account.internalID = BIGINT_ZERO;
    account.address = Address.fromString(ZERO_ADDRESS) as Bytes;
    account.createdAt = compoundIdToSortableDecimal(transactionId);
    account.lastUpdatedAt = compoundIdToSortableDecimal(transactionId);
    account.createdAtTransaction = transactionId;
    account.lastUpdatedAtTransaction = transactionId;

    account.save();
  }

  return account as ProtocolAccount;
}

export function createIfNewAccount(
  accountId: i32,
  transactionId: String,
  addressString: String,
  proxy: Proxy
): void {
  if (accountId > USER_ACCOUNT_THRESHOLD) {
    getOrCreateUser(
      intToString(accountId),
      transactionId,
      addressString,
      proxy
    );
  } else {
    getOrCreatePool(
      intToString(accountId),
      transactionId,
      addressString,
      proxy
    );
  }
}
