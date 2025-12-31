
import overlayToolkit from "overlay-toolkit";
import { repo } from "./data_repo";

export class Uploader {
    webhook: string;
    token: string;
    url: string = "https://api.ffxiv.cyou/submarine/upload";

    constructor(webhook: string, token: string) {
        this.webhook = webhook;
        this.token = token;
    }

    public setUrlToken(url: string, token: string) {
        this.webhook = url;
        this.token = token;
    }

    public async postKdocsRaw(argv: any): Promise<any>{
        const response = await overlayToolkit.Fetch(this.webhook, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "AirScript-Token": this.token
            },
            body: JSON.stringify({
                Context: {
                    argv: argv
                },
            }),
        });

        const body = response.body as unknown as string;
        if (response.ok) {
            return JSON.parse(body)
        }

        try {
            const errObj = JSON.parse(body);
            throw new Error(errObj.error || errObj.msg || errObj.reason || errObj.result || body);
        } catch {
            throw new Error(body);
        }
    }

    public async kdocsInsertRows(rows: ITableRow[]): Promise<any> {
        const argv = {
            data: rows.map(row => {
                return {
                    fields: row.ToRow()
                }
            }),
        }
        return this.postKdocsRaw(argv);
    }

    public async kdocsUploadV1(ship: string, items: Item[]): Promise<any> {
        const rows = items.map(item => new ItemRowV1(ship, item));
        return this.kdocsInsertRows(rows);
    }

    public async kdocsUploadV1Ex(result: ExplorationResult): Promise<any> {
        const rows = result.items.map(item => new ItemRowV1(result.name, item));
        return this.kdocsInsertRows(rows);
    }

    public async kdocsUploadV2(result: ExplorationResult): Promise<any> {
        const rows = result.items.map(item => new ItemRowV2(result, item));
        return this.kdocsInsertRows(rows);
    }

    public async analysisUploadV2(result: ExplorationResult): Promise<any> {
        const payload : ExplorationResult & { digest?: string } = result;
        
        // 匿名化处理
        const key = result.registerTime + "_" + result.returnTime + "_" + result.name;
        const encoder = new TextEncoder();
        const data = encoder.encode(key);
        const hash = await new SubtleCrypto().digest("SHA-1", data);
        const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        payload.digest = hashHex;
        payload.name = "";
        payload.registerTime = 0;
        payload.returnTime = 0;

        return fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    }
}

export interface ITableRow {
    ToRow(): { [key: string]: string | number | boolean };
}

class ItemRowV1 implements ITableRow, Item {
    id: number;
    amount: number;
    hq: boolean;
    ship: string;

    constructor(ship: string, item: Item) {
        this.id = item.id;
        this.amount = item.amount;
        this.hq = item.hq;
        this.ship = ship;
    }

    ToRow(): { [key: string]: string | number | boolean; } {
        const name = repo.name(this.id);
        const price = repo.price(this.id, this.hq);
        return {
          '潜艇名': this.ship,
          '物品名': name,
          '数量': this.amount,
          '单价': price,
          '总价': price! * this.amount,
        };
    }
}

class ItemRowV2 implements ITableRow, ExplorationItemExtended {
    id: number;
    amount: number;
    hq: boolean;
    surveillance: number;
    retrieval: number;
    discoveryDesc: number;
    doubleDip: boolean;
    isSecondDip: boolean;
    fromTier3Pool: boolean;
    destId: number;
    rating: number;

    ship: string;
    returnTime: number;
    dests: number[];
    parts: number[];
    rank: number;

    constructor(ship: ExplorationResult, item: ExplorationItemExtended) {
        this.id = item.id;
        this.amount = item.amount;
        this.hq = item.hq;
        this.surveillance = item.surveillance;
        this.retrieval = item.retrieval;
        this.discoveryDesc = item.discoveryDesc;
        this.doubleDip = item.doubleDip;
        this.isSecondDip = item.isSecondDip;
        this.fromTier3Pool = item.fromTier3Pool;
        this.destId = item.destId;
        this.rating = item.rating;

        this.ship = ship.name;
        this.returnTime = ship.returnTime;
        this.dests = ship.dests;
        this.parts = ship.parts;
        this.rank = ship.rank;
    }

    ToRow(): { [key: string]: string | number | boolean; } {
        const name = repo.name(this.id);
        const price = repo.price(this.id, this.hq);
        const parts = [this.parts[2], this.parts[3], this.parts[0], this.parts[1]].map(partId => repo.getPartName(partId));
        return {
          '潜艇名': this.ship,
          '航线': this.dests.map(destId => repo.getDestName(destId)).join(""),
          '等级': this.rank,
          '部件': parts.join(""),
          '地图名': repo.getDestMapName(this.destId),
          '目的地': repo.getDestName(this.destId),
          '物品名': name,
          '数量': this.amount,
          '单价': price,
          '总价': price! * this.amount,
          '探索情况': this.surveillance,
          '收集情况': this.retrieval,
          '收集描述': this.discoveryDesc,
          '恩惠状态': this.doubleDip,
          '恩惠产物': this.isSecondDip,
          '高级产物': this.fromTier3Pool,
          '评分': repo.getRating(this.rating),
          '时间': new Date(this.returnTime * 1000).toLocaleString('zh-CN', { hour12: false }),
        };
    }
}