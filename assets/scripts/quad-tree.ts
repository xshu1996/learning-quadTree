/**
 * 同 cc.Rect 以矩形左下角为起点
 */
export interface Bounds {
    x: number,
    y: number,
    width: number,
    height: number,
}

export enum EQuadrant {
    None = -1,
    First,
    Second,
    Third,
    Fourth,
}

export default class QuadTree<T extends Bounds> {

    /** 四叉树的最大层数 */
    public maxLevel: number = 5;
    /** 该四叉树的范围 */
    public bounds: Bounds;
    /** 该节点所容纳的最多的对象个数 */
    public maxObjects: number;
    /** 当前节点的层级 */
    public level: number;
    /** 当前节点所拥有的四个象限的子节点数组 */
    public quadrant: QuadTree<T>[];
    /** 当前节点所存储的节点对象数组 */
    public objects: T[];

    constructor(bounds: Bounds, maxObjects?: number, maxLevel?: number, level?: number) {
        this.maxLevel = maxLevel || 4;
        this.bounds = bounds;
        this.maxObjects = maxObjects || 10;
        this.level = level || 0;

        this.objects = [];
        this.quadrant = [];
    }

    /** 将该节点分割为4个子节点 */
    public split(): void {
        let nextLevel = this.level + 1,
            subWidth = this.bounds.width / 2,
            subHeight = this.bounds.height / 2,
            x = this.bounds.x,
            y = this.bounds.y;
        // 四个象限坐标系原点
        const oriCoordinate: { x: number, y: number }[] = [
            { x: x + subWidth, y: y + subHeight },
            { x, y: y + subHeight },
            { x, y },
            { x: x + subWidth, y }
        ];
        this.quadrant = oriCoordinate.map(pos =>
            new QuadTree({
                x: pos.x,
                y: pos.y,
                width: subWidth,
                height: subHeight
            }, this.maxObjects, this.maxLevel, nextLevel)
        );
    }

    public getIndex(pRect: Bounds): number[] {
        let indexes: number[] = [];
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

        const endIsSouth = pRect.y < horizontalMidpoint,
            startIsWest = pRect.x < verticalMidpoint,
            endIsEast = pRect.x + pRect.width > verticalMidpoint,
            startIsNorth = pRect.y + pRect.height > horizontalMidpoint;

        // top-right quad
        if (startIsNorth && endIsEast) {
            indexes.push(EQuadrant.First);
        }

        // top-left quad
        if (startIsWest && startIsNorth) {
            indexes.push(EQuadrant.Second);
        }

        // bottom-left quad
        if (startIsWest && endIsSouth) {
            indexes.push(EQuadrant.Third);
        }

        // bottom-right quad
        if (endIsEast && endIsSouth) {
            indexes.push(EQuadrant.Fourth);
        }

        // console.log("查看象限：", indexes);
        return indexes;
    }

    /** 插入 */
    public insert(obj): void {
        if (!obj) return;

        // console.log("插入");
        let i = 0,
            indexes;
        /** 如果该节点已经分裂了就将对象放到对应的子节点里面 */
        if (this.quadrant.length > 0) {
            indexes = this.getIndex(obj);

            indexes.forEach(element => {
                if (element !== EQuadrant.None) {
                    this.quadrant[element].insert(obj);
                }
            });
            return;
        }
        this.objects.push(obj);
        // 长度大于容量
        if (this.objects.length > this.maxObjects && this.level < this.maxLevel) {
            // 如果超过该节点所能容纳的最多节点就分裂并且将该节点下的所有对象都放到分裂的子节点下
            if (this.quadrant.length === 0) {
                /** 分裂 */
                this.split();
            }
            this.objects.forEach(obj => {
                this.getIndex(obj)
                    .filter(ele => ele !== EQuadrant.None)
                    .forEach(ele => {
                        this.quadrant[ele].insert(obj);
                    });
            });

            /** 清空该节点下的所有对象 */
            this.objects.length = 0;
        }
    }

    /**
     * 返回所有可能与给定对象发生冲突的对象
     * return all objects that could collide with the given object
     * 
     */
    public retrieve(obj) {
        let indexes = this.getIndex(obj),
            ret = this.objects;

        if (this.quadrant.length > 0) {
            indexes
                .filter(v => v !== EQuadrant.None)
                .forEach((ele) => {
                    ret = ret.concat(this.quadrant[ele].retrieve(obj));
                });
        }
        /** 去重 */
        ret = ret.filter((ele, index) => {
            return ret.indexOf(ele) >= index;
        });

        return ret;
    }

    public clear(): void {
        this.objects.length = 0;
        this.quadrant.forEach(ele => ele.clear());
        this.quadrant.length = 0;
    }
}