
import { IncrementalSell as IncrementalSellContract, IncrementalSellUpdated, IncrementalSell__incrementalPriceResult, IncrementalTreeSold } from "../../generated/IncrementalSell/IncrementalSell";
import { IncrementalSell, Owner, Tree, Activity, Referrer,BatchBuy} from "../../generated/schema";
import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { COUNTER_ID, getCount_updateSpec, getGlobalData, INCREMENTAL_SELL_ID, ZERO_ADDRESS,getCount_BatchBuy,getCount_activity } from '../helpers';



function upsertTreeIncremental(id: string): void {
    let tree = Tree.load(id);
    if (!tree) tree = new Tree(id);
    tree.provideStatus = BigInt.fromI32(2);
    tree.treeStatus = BigInt.fromI32(2);
    tree.save();
}
function newOwner(id: string): Owner {
    let owner = new Owner(id);
    owner.treeCount = BigInt.fromI32(0);
    owner.spentWeth = BigInt.fromI32(0);
    owner.spentDai = BigInt.fromI32(0);
    owner.auctionCount = BigInt.fromI32(0);
    owner.regularCount = BigInt.fromI32(0);
    owner.incrementalCount = BigInt.fromI32(0);
    owner.auctionSpent = BigInt.fromI32(0);
    owner.regularSpent = BigInt.fromI32(0);
    owner.incrementalSpent = BigInt.fromI32(0);
    return owner;
}
function newReferrer(id: string): Referrer {
    let referrer = new Referrer(id);
    referrer.referredRegular = BigInt.fromI32(0);
    referrer.regularUnused=BigInt.fromI32(0);
    referrer.referredAuction = BigInt.fromI32(0);
    referrer.referredBid = BigInt.fromI32(0);
    referrer.referredIncremental = BigInt.fromI32(0);
    referrer.genesisGifts = BigInt.fromI32(0);
    referrer.regularGifts = BigInt.fromI32(0);
    referrer.claimedGenesisGifts = BigInt.fromI32(0);
    referrer.claimedRegularGifts = BigInt.fromI32(0);
    return referrer;
}


/*
  struct IncrementalPrice {
        uint256 startTree;
        uint256 endTree;
        uint256 initialPrice;
        uint64 increaseStep;
        uint64 increaseRatio;
    }
 */
function setIncSellData(incSell: IncrementalSell | null, c_incSell: IncrementalSell__incrementalPriceResult): void {
    incSell.startTree = c_incSell.value0.toHexString();
    incSell.endTree = c_incSell.value1.toHexString();
    incSell.startTreeId = c_incSell.value0 as BigInt;
    incSell.endTreeId = c_incSell.value1 as BigInt;
    incSell.initialPrice = c_incSell.value2 as BigInt;
    incSell.increaseStep = BigInt.fromI32(c_incSell.value3.toI32());
    incSell.increaseRatio = BigInt.fromI32(c_incSell.value4.toI32());
}
export function handleIncrementalSellUpdated(event: IncrementalSellUpdated): void {
    let incrementalSellContract = IncrementalSellContract.bind(event.address);
    let c_incSell = incrementalSellContract.incrementalPrice();
    let incSell = IncrementalSell.load(INCREMENTAL_SELL_ID);
    if (!incSell) incSell = new IncrementalSell(INCREMENTAL_SELL_ID);
    setIncSellData(incSell, c_incSell);
    for (let i = parseInt(incSell.startTree); i <= parseInt(incSell.endTree); i++) {
        upsertTreeIncremental(BigInt.fromString(i.toString().split(".")[0]).toHexString());
    }
    incSell.save();
}
export function handleIncrementalRatesUpdated(event: IncrementalSellUpdated): void {
    let incrementalSellContract = IncrementalSellContract.bind(event.address);
    let c_incSell = incrementalSellContract.incrementalPrice();
    let incSell = IncrementalSell.load(INCREMENTAL_SELL_ID);
    if (!incSell) incSell = new IncrementalSell(INCREMENTAL_SELL_ID);
    setIncSellData(incSell, c_incSell);
    incSell.save();
}

export function handleIncrementalTreeSold(event: IncrementalTreeSold): void {
    let count = event.params.count;
    let amount = event.params.amount;
    let startId = event.params.startId;
    let referrerAddress = event.params.referrer;
    let buyer = event.params.buyer;
    let isr=new BatchBuy(getCount_BatchBuy(COUNTER_ID).toHexString());
    isr.count = count as BigInt;
    isr.owner = buyer.toHexString();
    isr.amount = amount as BigInt;
    isr.date = event.block.timestamp;
    isr.type ="incremental";
    if (referrerAddress!= ZERO_ADDRESS){
        
        let referrer: Referrer | null =Referrer.load(referrerAddress);
        if (!referrer) referrer=new Referrer(referrerAddress.toHexString());
        referrer.referredIncremental=referrer.referredIncremental.plus(count as BigInt);
        referrer.genesisGifts=referrer.genesisGifts.plus(count as BigInt);
        referrer.save();
        isr.referrer=referrerAddress;
    }
    let activity = new Activity(getCount_activity(COUNTER_ID).toHexString());
    activity.activityType='incremental';
    activity.actor=buyer.toHexString();
    activity.treeCount=count as BigInt;
    activity.amount=amount as BigInt;
    activity.activityReferenceId=isr.id;
    activity.eventDate=event.block.timestamp as BigInt;
    activity.save()
    isr.save();
    
    for (let i = parseInt(startId); i <= parseInt(startId.plus(count as BigInt)); i++) {
        let tree = Tree.load(i.toHexString());
        tree.owner=buyer.toHexString();
        tree.requestId=isr.id;
        tree.mintStatus = BigInt.fromI32(1);
        tree.provideStatus= BigInt.fromI32(0);
        tree.save();
    }
    
    let gb = getGlobalData();
    let owner = Owner.load(buyer.toHexString());
    if (!owner) gb.ownerCount = gb.ownerCount.plus(BigInt.fromI32(1));
    if (!owner) owner = newOwner(event.params.buyer.toHexString());
    owner.incrementalCount = owner.incrementalCount.plus(count as BigInt);
    owner.incrementalSpent = owner.incrementalSpent.plus(amount as BigInt);
    owner.treeCount = owner.treeCount.plus(count as BigInt);
    owner.spentWeth = owner.spentWeth.plus(amount as BigInt);
    owner.save();
   
    gb.totalIncrementalSellCount = gb.totalIncrementalSellCount.plus(count as BigInt);
    gb.totalIncrementalSellAmount = gb.totalIncrementalSellAmount.plus(amount as BigInt);
    let nowSold=startId.plus(count as BigInt).minus(BigInt.fromI32(1));
    if (nowSold.gt(gb.lastIncrementalSold as BigInt)) {
        gb.lastIncrementalSold = nowSold as BigInt;
    }
    let incSell = IncrementalSell.load(INCREMENTAL_SELL_ID);
    gb.prevIncrementalPrice = ((nowSold.minus(incSell.startTreeId as BigInt)).div(incSell.increaseStep as BigInt)).times(incSell.increaseRatio as BigInt).times(incSell.initialPrice as BigInt).plus(incSell.initialPrice as BigInt);
    gb.nowIncrementalPrice = nowSold.plus(BigInt.fromI32(1)).minus(incSell.startTreeId as BigInt).div(incSell.increaseStep as BigInt).times(incSell.increaseRatio as BigInt).times(incSell.initialPrice as BigInt).plus(incSell.initialPrice as BigInt);
    gb.nextIncremetalPrice = nowSold.plus(BigInt.fromI32(2)).minus(incSell.startTreeId as BigInt).div(incSell.increaseStep as BigInt).times(incSell.increaseRatio as BigInt).times(incSell.initialPrice as BigInt).plus(incSell.initialPrice as BigInt);
    gb.ownedTreeCount = gb.ownedTreeCount.plus(count as BigInt);
    gb.incrementalBatchBuyCount=gb.incrementalBatchBuyCount.plus(BigInt.fromI32(1));
    gb.save();
}
