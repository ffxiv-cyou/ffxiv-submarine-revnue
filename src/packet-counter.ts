import { OverlayToolkit, Packet, PacketFilter } from "overlay-toolkit";
import { FFXIVIpcActorControlSelf, FFXIVIpcSubmarineExplorationResult, FFXIVIpcSubmarineStatusList, SubmarineStatusListItem } from "./packet";

interface OpcodeMap {
    [key: string]: number;
}

export enum PacketType {
    SubmarineExplorationResult,
    SubmarineStatusList,
    ActorControlSelf,
};

const Direction = {
    [PacketType.ActorControlSelf]: false,
    [PacketType.SubmarineExplorationResult]: true,
    [PacketType.SubmarineStatusList]: false,
}

const enum ActorControlSelfCategory {
    OpenSubmarineMenu = 1076,
    CloseSubmarineMenu = 1077,
}

export class PacketBasedCounter {
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

        otk.SubscribePacket("SubmarineRevnue", this.genPacketFilter(), this.parse.bind(this));
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
    //#endregion

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
                this.ships = statusList.items;
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

    currentId: number = 0;
    ships: SubmarineStatusListItem[] = [];

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

        console.log("Exploration result for ship:", ship, "result:", result);
    }
}

