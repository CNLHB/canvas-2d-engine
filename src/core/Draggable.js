import Event from '../event/event';


export default class  Draggable extends Event {
    constructor(){
        super()
        this.on('mousedown', this._dragStart, this);
        this.on('mousemove', this._drag, this);
        this.on('mouseup', this._dragEnd, this);
        // `mosuemove` and `mouseup` can be continue to fire when dragging.
        // See [Drag outside] in `Handler.js`. So we do not need to trigger
        // `_dragEnd` when globalout. That would brings better user experience.
        // this.on('globalout', this._dragEnd, this);
    
        // this._dropTarget = null;
        // this._draggingTarget = null;
    
        // this._x = 0;
        // this._y = 0;
    }
    _dragStart (e) {
        var draggingTarget = e.target;
        // Find if there is draggable in the ancestor
        while (draggingTarget && !draggingTarget.draggable) {
            draggingTarget = draggingTarget.parent;
        }
        console.log('_dragStart',draggingTarget);
        if (draggingTarget) {
            this._draggingTarget = draggingTarget;
            draggingTarget.dragging = true;
            this._x = e.offsetX;
            this._y = e.offsetY;
            this.dispatchToElement(param(draggingTarget, e), 'dragstart', e.event);
        }
    }

    _drag (e) {
        var draggingTarget = this._draggingTarget;

        // console.log('draggingTarget',draggingTarget);
        if (draggingTarget) {
            var x = e.offsetX;
            var y = e.offsetY;
            var dx = x - this._x;
            var dy = y - this._y;
            this._x = x;
            this._y = y;
            draggingTarget.drift(dx, dy, e);
            this.dispatchToElement(param(draggingTarget, e), 'drag', e.event);

            var dropTarget = this.findHover(x, y, draggingTarget).target;
            var lastDropTarget = this._dropTarget;
            this._dropTarget = dropTarget;

            if (draggingTarget !== dropTarget) {
                if (lastDropTarget && dropTarget !== lastDropTarget) {
                    this.dispatchToElement(param(lastDropTarget, e), 'dragleave', e.event);
                }
                if (dropTarget && dropTarget !== lastDropTarget) {
                    this.dispatchToElement(param(dropTarget, e), 'dragenter', e.event);
                }
            }
        }
    }

    _dragEnd (e) {
        var draggingTarget = this._draggingTarget;

        if (draggingTarget) {
            draggingTarget.dragging = false;
        }

        this.dispatchToElement(param(draggingTarget, e), 'dragend', e.event);

        if (this._dropTarget) {
            this.dispatchToElement(param(this._dropTarget, e), 'drop', e.event);
        }

        this._draggingTarget = null;
        this._dropTarget = null;
    }
}



function param(target, e) {
    return {target: target, topTarget: e && e.topTarget};
}
