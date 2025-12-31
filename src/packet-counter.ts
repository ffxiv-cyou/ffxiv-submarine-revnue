import { OverlayToolkit, Packet, PacketFilter } from "overlay-toolkit";
import { FFXIVIpcActorControlSelf, FFXIVIpcSubmarineExplorationResult, FFXIVIpcSubmarineStatusList, submarineExplorationResultItem, SubmarineStatusListItem } from "./packet";

interface OpcodeMap {
    [key: string]: number;
}

export enum PacketType {
    SubmarineExplorationResult,
    SubmarineStatusList,
    ActorControlSelf,
};

enum ShipStatus {
    Empty = 0,
    Returned = 1,
    Exploring = 2,
}

const Direction = {
    [PacketType.ActorControlSelf]: false,
    [PacketType.SubmarineExplorationResult]: true,
    [PacketType.SubmarineStatusList]: false,
}

const enum ActorControlSelfCategory {
    OpenSubmarineMenu = 1076,
    CloseSubmarineMenu = 1077,
}

/**
 * 基于数据包的潜艇探索收益统计器
 */
export class PacketBasedCounter {
    callback: (data: ExplorationResult) => void;

    constructor(callback: (data: ExplorationResult) => void) {
        this.callback = callback;
    }

    //#region Opcode
    opcodeMap: Map<number, PacketType> = new Map<number, PacketType>();

    async init(otk: OverlayToolkit): Promise<void> {
        const opcodes = await fetch(`/data/opcode.json`);
        const opcodeMap = await opcodes.json() as OpcodeMap;

        Object.keys(PacketType).forEach((key) => {
            if (!isNaN(Number(key)))
                return;
            const value = PacketType[key as keyof typeof PacketType];
            this.opcodeMap.set(opcodeMap[key], value);
        });

        await otk.SubscribePacket("SubmarineRevnue", this.genPacketFilter(), this.parse.bind(this));
    }

    genPacketFilter(): PacketFilter[] {
        const filters: PacketFilter[] = [];
        this.opcodeMap.forEach((value, key) => {
            filters.push({
                opcode: key,
                direction: Direction[value],
            });
        });
        return filters;
    }
    
    private parse(packet: Packet) {
        const dw = new DataView(packet.data.buffer, packet.data.byteOffset, packet.data.byteLength);
        const ptype = this.opcodeMap.get(packet.opcode);
        switch (ptype) {
            case PacketType.SubmarineExplorationResult: {
                const result = new FFXIVIpcSubmarineExplorationResult(dw);
                this.handleExplorationResult(result);
                console.log("Submarine Exploration Result:", result);
                break;
            }
            case PacketType.SubmarineStatusList: {
                const statusList = new FFXIVIpcSubmarineStatusList(dw);
                this.handleShipStatusList(statusList);
                console.log("Submarine Status List:", statusList);
                break;
            }
            case PacketType.ActorControlSelf: {
                const actor = new FFXIVIpcActorControlSelf(dw);
                switch (actor.category) {
                    case ActorControlSelfCategory.OpenSubmarineMenu:
                        this.currentId = actor.param1;
                        break;
                    case ActorControlSelfCategory.CloseSubmarineMenu:
                        if (this.currentId !== actor.param1) {
                            console.warn("Mismatched submarine ID on close:", actor.param1, "expected:", this.currentId);
                        }
                        this.currentId = -1;
                        break;
                }
                break;
            }
        }
    }
    //#endregion

    currentId: number = 0;
    ships: SubmarineStatusListItem[] = [];
    results: FFXIVIpcSubmarineExplorationResult[] = [];

    getCurrentShip(): SubmarineStatusListItem | null {
        if (this.currentId < 0 || this.currentId >= this.ships.length) {
            return null;
        }
        return this.ships[this.currentId];
    }

    private handleExplorationResult(result: FFXIVIpcSubmarineExplorationResult) {
        const ship = this.getCurrentShip();
        if (!ship) {
            console.warn("No current ship for exploration result");
            return;
        }
        this.results[this.currentId] = result;
        console.log("Exploration result for ship:", ship, "result:", result);
    }

    private handleShipStatusList(statusList: FFXIVIpcSubmarineStatusList) {
        for (let i = 0; i < statusList.items.length; i++) {
            const item = statusList.items[i];
            const oldItem = this.ships[i];
            // 只处理确认探索结果的那一次数据
            if (item.status !== ShipStatus.Returned) {
                continue;
            }
            if (oldItem && oldItem.status !== ShipStatus.Exploring) {
                continue;
            }

            this.handleShipReturnedResult(i);
        }

        this.ships = statusList.items;
    }

    private handleShipReturnedResult(index: number) {
        const ship = this.ships[index];
        const result = this.results[index];
        if (!ship || !result) {
            console.warn("No ship or result for returned ship at index:", index);
            return;
        }
        // 构建数据
        const data = submarineToResult(ship, result);
        this.callback(data);
    }
}

function submarineToResult(ship: SubmarineStatusListItem, result: FFXIVIpcSubmarineExplorationResult): ExplorationResult {
    const items = [];
    for (const item of result.items) {
        const extendedItems = explorationItemToExtended(item);
        items.push(...extendedItems);
    }
    
    return {
        registerTime: ship.registerTime,
        returnTime: ship.returnTime,
        name: ship.name,
        rank: ship.rank,
        dests: ship.dests,
        rating: result.rating,
        parts: [ship.hull, ship.stern, ship.bow, ship.bridge],
        items: items,
    };
}

function explorationItemToExtended(item: submarineExplorationResultItem): ExplorationItemExtended[] {
    const extendedItems: ExplorationItemExtended[] = [];

    const item1: ExplorationItemExtended = {
        doubleDip: item.doubleDip,
        isSecondDip: false,
        fromTier3Pool: item.item2IsNormal === 0,
        id: item.item1Id,
        amount: item.item1Quantity,
        hq: item.item1IsHq,
        surveillance: item.loot1SurveillanceResult,
        retrieval: item.loot1RetrievalResult,
        discoveryDesc: item.favorResult,
        destId: item.destId,
        rating: item.rating,
    };
    extendedItems.push(item1);

    if (item.doubleDip) {
        const item2: ExplorationItemExtended = {
            doubleDip: item.doubleDip,
            isSecondDip: true,
            fromTier3Pool: item.item2IsNormal === 0,
            id: item.item2Id,
            amount: item.item2Quantity,
            hq: item.item2IsHq,
            surveillance: item.loot2SurveillanceResult,
            retrieval: item.loot2RetrievalResult,
            discoveryDesc: item.favorResult,
            destId: item.destId,
            rating: item.rating,
        };
        extendedItems.push(item2);
    }

    return extendedItems;
}