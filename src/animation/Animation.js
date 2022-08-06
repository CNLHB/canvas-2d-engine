/**
 * Animation main class, dispatch and manage all animation controllers
 *
 * @module zrender/animation/Animation
 * @author pissang(https://github.com/pissang)
 */
// TODO Additive animation
// http://iosoteric.com/additive-animations-animatewithduration-in-ios-8/
// https://developer.apple.com/videos/wwdc2014/#236

import * as util from '../utils/util';
import Event from '../event/event';
import requestAnimationFrame from './requestAnimationFrame';
// import Animator from './Animator';

/**
 * @typedef {Object} IZRenderStage
 * @property {Function} update
 */

/**
 * @alias module:zrender/animation/Animation
 * @constructor
 * @param {Object} [options]
 * @param {Function} [options.onframe]
 * @param {IZRenderStage} [options.stage]
 * @example
 *     var animation = new Animation();
 *     var obj = {
 *         x: 100,
 *         y: 100
 *     };
 *     animation.animate(node.position)
 *         .when(1000, {
 *             x: 500,
 *             y: 500
 *         })
 *         .when(2000, {
 *             x: 100,
 *             y: 100
 *         })
 *         .start('spline');
 */

class Animation extends Event{
    stage
    onframe
    _clips
    _running
    _time
    _pausedTime
    _pauseStart
    _paused
    constructor(options){
        super()
        options = options || {};

        this.stage = options.stage || {};
    
        this.onframe = options.onframe || function () {};
    
        // private properties
        this._clips = [];
    
        this._running = false;
    
        this._time;
    
        this._pausedTime;
    
        this._pauseStart;
    
        this._paused = false;
    }
     /**
     * Add clip
     * @param {Clip} clip
     */
      addClip (clip) {
        this._clips.push(clip);
    }
    /**
     * Add animator
     * @param {module:zrender/animation/Animator} animator
     */
    addAnimator(animator) {
        animator.animation = this;
        var clips = animator.getClips();
        for (var i = 0; i < clips.length; i++) {
            this.addClip(clips[i]);
        }
    }
    /**
     * Delete animation clip
     * @param {module:zrender/animation/Clip} clip
     */
    removeClip (clip) {
        var idx = util.indexOf(this._clips, clip);
        if (idx >= 0) {
            this._clips.splice(idx, 1);
        }
    }

    /**
     * Delete animation clip
     * @param {module:zrender/animation/Animator} animator
     */
    removeAnimator (animator) {
        var clips = animator.getClips();
        for (var i = 0; i < clips.length; i++) {
            this.removeClip(clips[i]);
        }
        animator.animation = null;
    }

    _update() {
        var time = new Date().getTime() - this._pausedTime;
        var delta = time - this._time;
        var clips = this._clips;
        var len = clips.length;

        var deferredEvents = [];
        var deferredClips = [];
        for (var i = 0; i < len; i++) {
            var clip = clips[i];
            var e = clip.step(time, delta);
            // Throw out the events need to be called after
            // stage.update, like destroy
            if (e) {
                deferredEvents.push(e);
                deferredClips.push(clip);
            }
        }

        // Remove the finished clip
        for (var i = 0; i < len;) {
            if (clips[i]._needsRemove) {
                clips[i] = clips[len - 1];
                clips.pop();
                len--;
            }
            else {
                i++;
            }
        }

        len = deferredEvents.length;
        for (var i = 0; i < len; i++) {
            deferredClips[i].fire(deferredEvents[i]);
        }

        this._time = time;

        this.onframe(delta);

        // 'frame' should be triggered before stage, because upper application
        // depends on the sequence (e.g., echarts-stream and finish
        // event judge)
        this.trigger('frame', delta);

        if (this.stage.update) {
            this.stage.update();
        }
    }

    _startLoop() {
        var self = this;

        this._running = true;

        function step() {
            if (self._running) {

                requestAnimationFrame(step);

                !self._paused && self._update();
            }
        }

        requestAnimationFrame(step);
    }

    /**
     * Start animation.
     */
    start () {

        this._time = new Date().getTime();
        this._pausedTime = 0;

        this._startLoop();
    }

    /**
     * Stop animation.
     */
    stop() {
        this._running = false;
    }

    /**
     * Pause animation.
     */
    pause () {
        if (!this._paused) {
            this._pauseStart = new Date().getTime();
            this._paused = true;
        }
    }

    /**
     * Resume animation.
     */
    resume () {
        if (this._paused) {
            this._pausedTime += (new Date().getTime()) - this._pauseStart;
            this._paused = false;
        }
    }

    /**
     * Clear animation.
     */
    clear () {
        this._clips = [];
    }
    /**
     * Whether animation finished.
     */
    isFinished () {
        return !this._clips.length;
    }

    /**
     * Creat animator for a target, whose props can be animated.
     *
     * @param  {Object} target
     * @param  {Object} options
     * @param  {boolean} [options.loop=false] Whether loop animation.
     * @param  {Function} [options.getter=null] Get value from target.
     * @param  {Function} [options.setter=null] Set value to target.
     * @return {module:zrender/animation/Animation~Animator}
     */
    // TODO Gap
    animate(target, options) {
        options = options || {};

        // var animator = new Animator(
        //     target,
        //     options.loop,
        //     options.getter,
        //     options.setter
        // );

        // this.addAnimator(animator);

        // return animator;
    }
}


export default Animation;