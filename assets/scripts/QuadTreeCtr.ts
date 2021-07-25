
import QuadTree, { Bounds } from "./quad-tree";
import { gridItem } from "./grid-item";

const { ccclass, property } = cc._decorator;

@ccclass
export class QuadTreeCtr extends cc.Component {

    @property(cc.Prefab)
    p_pfbBlock: cc.Prefab = null;

    @property([cc.Color])
    public levelColor: cc.Color[] = [];

    private draw: cc.Graphics;
    private drawNode: cc.Node;
    private w: number = 0;
    private h: number = 0;
    private qtRoot: QuadTree<cc.Node> = null;
    private _blockList: cc.Node[] = [];
    private isMouseMoving: boolean = false;
    private mouseNode: Bounds = null;
    private waitCheckNodeQue: cc.Node[] = [];
    private _mouseDebugNode: cc.Node = null;

    protected onLoad(): void {
        this.drawNode = new cc.Node();
        this.node.addChild(this.drawNode);

        this.drawNode.addComponent(cc.Graphics);

        this.draw = this.drawNode.getComponent(cc.Graphics);

        this.draw.lineWidth = 2;
        this.draw.lineCap = cc.Graphics.LineCap.SQUARE;
        this.draw.lineJoin = cc.Graphics.LineJoin.MITER;
        this.draw.strokeColor = new cc.Color(255, 0, 0, 255);

        this.node.on(cc.Node.EventType.MOUSE_MOVE, this._mouseMove, this);
        this.node.on(cc.Node.EventType.MOUSE_LEAVE, this._mouseLeave, this);

        this.w = this.node.width;
        this.h = this.node.height;
        this.createRange(this.w, this.h);
        this.qtRoot = new QuadTree({
            x: 0,
            y: 0,
            width: 960,
            height: 640,
        }, 4, 5);

        this.mouseNode = {
            x: 0,
            y: 0,
            width: 20,
            height: 20,
        };
        this._mouseDebugNode = new cc.Node('mouse');
        const texture = this.createSingleTexture();
        this._mouseDebugNode.addComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(texture);
        this._mouseDebugNode.getComponent(cc.Sprite).sizeMode = cc.Sprite.SizeMode.CUSTOM;
        this._mouseDebugNode.setContentSize(cc.size(this.mouseNode.width, this.mouseNode.height));
        this.node.addChild(this._mouseDebugNode);
        this._mouseDebugNode.setPosition(cc.Vec2.ZERO);
    }

    /** 鼠标移动 */
    private _mouseMove(event: cc.Event.EventMouse): void {
        this.waitCheckNodeQue = [];
        let worldLocation = event.getLocation();

        let mouseLocation = this.node.convertToNodeSpaceAR(worldLocation);
        this.mouseNode.x = mouseLocation.x;
        this.mouseNode.y = mouseLocation.y;
        this._mouseDebugNode.setPosition(mouseLocation);

        this.qtRoot.getIndex(this.mouseNode);
    }

    private updateTargetsInfo(targets: cc.Node[]): void {
        for (let i = 0; i < targets.length; i++) {
            let itemCom: gridItem = targets[i].getComponent(gridItem);
            itemCom.check = true;
            targets[i].color = cc.Color.BLACK;
            targets[i].getChildByName('debug_num').color = cc.Color.WHITE;
        }
    }

    private resetTargetsColor(): void {
        this.waitCheckNodeQue.forEach((item) => {
            let itemCom: gridItem = item.getComponent(gridItem);
            itemCom.isCollision = false;
            item.color = cc.Color.BLACK;
            item.getChildByName('debug_num').color = cc.Color.WHITE;
        })
    }

    /** 鼠标离开 */
    private _mouseLeave(event): void {
        this.waitCheckNodeQue.forEach((item) => {
            let itemCom: gridItem = item.getComponent(gridItem);
            itemCom.isCollision = true;
            item.color = cc.Color.WHITE;
        })
    }

    private createRange(w: number, h: number): void {
        if (this.draw) {
            this.draw.moveTo(-this.w / 2, 0);
            this.draw.lineTo(this.w / 2, 0);

            this.draw.moveTo(0, this.h / 2);
            this.draw.lineTo(0, -this.h / 2);
            this.draw.stroke();
        }
    }

    public addObj(event, count: number = 1): void {
        for (let i = 0; i < count; i++) {
            let rect: cc.Node = cc.instantiate(this.p_pfbBlock);
            rect.getComponent(gridItem).vx = this.randomNumBoth(-0.5, 0.5);
            rect.getComponent(gridItem).vy = this.randomNumBoth(-0.5, 0.5);
            rect.x = this.randomNumBoth(rect.width / 2, this.qtRoot.bounds.width - rect.width / 2);
            rect.y = this.randomNumBoth(rect.height / 2, this.qtRoot.bounds.height - rect.height / 2);
            this.node.addChild(rect);
            const currIndex: number = this._blockList.length ?? 0;
            rect.getComponent(gridItem).index = currIndex;
            rect.getChildByName('debug_num').getComponent(cc.Label).string = `${currIndex}`;
            this._blockList.push(rect);
            this.qtRoot.insert(rect);
        }
    }

    public drawQT(qt: QuadTree<cc.Node>): void {
        let bounds = qt.bounds;
        if (qt.quadrant.length) {
            qt.quadrant.forEach((qd) => {
                this.drawQT(qd);
            });
        } else {
            this.draw.rect(bounds.x, bounds.y, bounds.width, bounds.height);
            const lv: number = qt.level;
            this.draw.strokeColor = this.levelColor[lv] ?? cc.Color.BLACK;
            this.draw.stroke();
        }
    }

    public loop(dt: number): void {
        this.qtRoot.clear();
        // update myObjects and insert them into the tree again
        for (let i = 0; i < this._blockList.length; i++) {
            let script = this._blockList[i].getComponent(gridItem);
            // judge the block is out of bound's range
            const [isOutHor, isOutVec] = this._isOutBound(this._blockList[i], this.qtRoot.bounds);
            if (isOutHor) script.vx = -script.vx;
            if (isOutVec) script.vy = -script.vy;
            script.check = false;
            // set color
            this._blockList[i].color = cc.Color.WHITE;
            this._blockList[i].getChildByName('debug_num').color = cc.Color.BLACK;

            this._blockList[i].x += script.vx;
            this._blockList[i].y += script.vy;

            this.qtRoot.insert(this._blockList[i]);
        }
    }

    private _isOutBound(obj: cc.Node, bound: Bounds): boolean[] {
        const minX = obj.x - obj.anchorX * obj.width * obj.scaleX;
        const maxX = obj.x + (1 - obj.anchorX) * obj.width * obj.scaleX;
        const minY = obj.y - obj.anchorY * obj.height * obj.scaleY;
        const maxY = obj.y + (1 - obj.anchorY) * obj.height * obj.scaleY;

        const isOutHor = minX < bound.x || maxX > bound.width + bound.x;
        const isOutVec = minY < bound.y || maxY > bound.y + bound.height;

        return [isOutHor, isOutVec];
    }

    public isOutOfRange(location, range): boolean {
        if (location > range.value1 || location < range.value2) {
            return true;
        }
        return false;
    }

    /**
     * 区间的随机数
     * @param min
     * @param max
     * @returns {number} [min, max]
     * @constructor
     */
    public randomNumBoth(min, max): number {
        [min, max] = [Math.min(min, max), Math.max(min, max)];
        let range = max - min;
        let rand = Math.random();
        // 四舍五入
        return min + Math.floor(rand * range);
    }

    protected update(dt: number): void {
        if (this.qtRoot) {
            this.draw.clear();
            this.drawQT(this.qtRoot);
            this.loop(dt);
            this.updateTargetsInfo(this.qtRoot.retrieve(this.mouseNode));
        }
    }

    public createSingleTexture(): cc.Texture2D {
        const data: Uint8Array = new Uint8Array(2 * 2 * 4);
        for (let i = 0; i < 2; ++i) {
            for (let j = 0; j < 2; ++j) {
                data[i * 2 * 4 + j * 4 + 0] = 255;
                data[i * 2 * 4 + j * 4 + 1] = 255;
                data[i * 2 * 4 + j * 4 + 2] = 255;
                data[i * 2 * 4 + j * 4 + 3] = 255;
            }
        }
        
        const texture = new cc.Texture2D();
        texture.name = "single color";
        // @ts-ignore
        texture.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, 2, 2);
        
        return texture;
    }
}
