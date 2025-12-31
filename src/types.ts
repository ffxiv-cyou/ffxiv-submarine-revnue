
export interface Item {
    /**
     * 物品ID
     */
    id: number;
    /**
     * 收获数量
     */
    amount: number;
    /**
     * 是否为HQ
     */
    hq: boolean;
}

export interface ExplorationItem extends Item {
    /**
     * 探索情况
     */
    surveillance: number;
    /**
     * 收集情况
     */
    retrieval: number;
    /**
     * 收集描述
     */
    discoveryDesc: number;
}

export interface ExplorationItemExtended extends ExplorationItem {
    /**
     * 恩惠状态
     */
    doubleDip: boolean;
    /**
     * 是否为恩惠产物
     */
    isSecondDip: boolean;
    /**
     * 产物是否从三级池获得
     */
    fromTier3Pool: boolean;

    /**
     * 目的地ID
     */
    destId: number;
    /**
     * 评分
     */
    rating: number;
}

export interface ExplorationResult {
    /**
     * 登记时间（Unix时间戳）
     */
    registerTime: number;
    /**
     * 返回时间（Unix时间戳）
     */
    returnTime: number;
    /**
     * 潜艇名称
     */
    name: string;
    /**
     * 等级
     */
    rank: number;

    /**
     * 目的地ID列表
     */
    dests: number[];
    /**
     * 评分
     */
    rating: number;
    /**
     * 部件列表
     */
    parts: number[];

    /**
     * 探索结果
     */
    items: ExplorationItemExtended[];
}
