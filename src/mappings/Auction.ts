
import { AuctionCreated, AuctionCreated__Params, AuctionEnded, AuctionEndTimeIncreased, AuctionSettled, HighestBidIncreased, TreeAuction as AuctionContract, TreeAuction__auctionsResult,TreeAuction__referralsResult } from "../../generated/Auction/TreeAuction";
import { Auction, Bid, Owner, Tree,Activity ,Referrer} from "../../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";
import { COUNTER_ID, getCount_bid, getGlobalData,getCount_activity,ZERO_ADDRESS } from "../helpers";

/**
     struct Auction {
        uint256 treeId;
        address bidder;
        uint64 startDate;
        uint64 endDate;
        uint256 highestBid;
        uint256 bidInterval;
    }
 */

function setAuctionData(auction: Auction, c_auction: TreeAuction__auctionsResult): void {
    auction.tree = c_auction.value0.toHexString();
    auction.startDate = c_auction.value2 as BigInt;
    auction.expireDate = c_auction.value3 as BigInt;
    auction.initialPrice = c_auction.value4 as BigInt;
    auction.priceInterval = c_auction.value5 as BigInt;
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
export function handleAuctionCreated(event: AuctionCreated): void {
    let auction = new Auction(event.params.auctionId.toHexString());
    let auctionContract = AuctionContract.bind(event.address);
    let c_auction = auctionContract.auctions(event.params.auctionId);
    setAuctionData(auction, c_auction);
    auction.isActive = true;
    auction.bidCount=BigInt.fromI32(0);
    auction.save();
    let tree = Tree.load(auction.tree);
    tree.provideStatus = BigInt.fromI32(1);
    tree.save();
}

export function handleHighestBidIncreased(event: HighestBidIncreased): void {
    // let { amount, auctionId, bidder, treeId } = event.params;
    let amount = event.params.amount;
    let auctionId = event.params.auctionId;
    let bidder = event.params.bidder;
    // let treeId = event.params.treeId;
    let bid = new Bid(getCount_bid(COUNTER_ID).toHexString());
    bid.auction = auctionId.toHexString();
    bid.bidder = bidder.toHexString();
    bid.bid = amount as BigInt;
    bid.date = event.block.timestamp as BigInt;
    let auctionContract = AuctionContract.bind(event.address);
    let referrerAddress=auctionContract.referrals(bidder,auctionId);
    if (referrerAddress!= ZERO_ADDRESS){
        let referrer: Referrer | null =Referrer.load(referrerAddress);
        if (!referrer) newReferrer(referrerAddress.toHexString());
        referrer.referredBid=referrer.referredBid.plus(BigInt.fromI32(1));
        referrer.save();
        bid.referrer=referrerAddress.toHexString();
    }
    bid.save();
    let activity = new Activity(getCount_activity(COUNTER_ID).toHexString());
    activity.activityType='bid';
    activity.actor=bidder.toHexString();
    activity.treeCount=BigInt.fromI32(1);
    activity.amount=amount as BigInt;
    activity.activityReferenceId=bid.id;
    activity.eventDate=event.block.timestamp as BigInt;
    activity.save()
    let auction = Auction.load(auctionId.toHexString());
    auction.highestBid = amount as BigInt;
    auction.bidCount=auction.bidCount.plus(BigInt.fromI32(1));
    auction.save();
}

export function handleAuctionSettled(event: AuctionSettled): void {
    let winner = event.params.winner;
    let treeId = event.params.treeId;
    let auctionId = event.params.auctionId;
    let amount = event.params.amount;
    let auction = Auction.load(auctionId.toHexString());
    auction.winner = winner.toHexString();
    auction.highestBid = amount as BigInt;
    auction.isActive = false;
    let winnerId: string = winner.toHexString();
    let owner: Owner | null = Owner.load(winnerId);
    let gb = getGlobalData();
    let auctionContract = AuctionContract.bind(event.address);
    let referrerAddress=auctionContract.referrals(winner,auctionId);
    if (referrerAddress!= ZERO_ADDRESS){
        let referrer=Referrer.load(referrerAddress);
        referrer.referredAuction=referrer.referredAuction.plus(BigInt.fromI32(1));
        referrer.genesisGifts=referrer.genesisGifts.plus(BigInt.fromI32(1));
        auction.referrer=referrerAddress;
        referrer.save();
    }
    if (!owner) gb.ownerCount=gb.ownerCount.plus(BigInt.fromI32(1));
    if (!owner) owner = newOwner(winner.toHexString());
    owner.treeCount = owner.treeCount.plus(BigInt.fromI32(1));
    owner.auctionCount=owner.auctionCount.plus(BigInt.fromI32(1));
    owner.auctionSpent = owner.auctionSpent.plus(amount as BigInt);
    owner.spentWeth = owner.spentWeth.plus(amount as BigInt);
    gb.totalAuctionTreeSellAmount=gb.totalAuctionTreeSellAmount.plus(amount as BigInt);
    gb.totalAuctionTreeSellCount=gb.totalAuctionTreeSellCount.plus(BigInt.fromI32(1));
    let tree = Tree.load(treeId.toHexString());
    tree.owner = owner.id;
    tree.provideStatus = BigInt.fromI32(0);
    tree.mintStatus = BigInt.fromI32(2);
    auction.save();
    tree.save();
    owner.save();
    gb.save();
    let activity = new Activity(getCount_activity(COUNTER_ID).toHexString());
    activity.activityType='winAuction';
    activity.actor=winner.toHexString();
    activity.treeCount=BigInt.fromI32(1);
    activity.amount=amount as BigInt;
    activity.activityReferenceId=auctionId.toHexString();
    activity.eventDate=event.block.timestamp as BigInt;
    activity.save();
}

export function handleAuctionEnded(event: AuctionEnded): void {
    let tree = Tree.load(event.params.treeId.toHexString());
    tree.provideStatus = BigInt.fromI32(0);
    let auction = Auction.load(event.params.auctionId.toHexString());
    auction.isActive = false;
    tree.save();
    auction.save();
}

export function handleAuctionEndTimeIncreased(event: AuctionEndTimeIncreased): void {
    let auction = Auction.load(event.params.auctionId.toHexString());
    auction.expireDate = event.params.newAuctionEndTime as BigInt;
    auction.save();
}

