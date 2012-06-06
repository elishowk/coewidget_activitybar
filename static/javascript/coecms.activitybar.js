/**
*  ActivityBar implements videotag activity timeline visualization
*  depends on :
*  * one UCE player widget
*  * ucewidget.js
*  * underscore.js
*  * jquery UI
*
*  Copyright (C) 2011 CommOnEcoute,
*/

$.uce.ActivityBar = function(){};
$.uce.ActivityBar.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        player: null,
        bins: 20,
        speakers : [],
        class_default: "comment",
        class_personality: "personnality-comment",
        class_self: "user-comment",
        mouseoutdelay: 1000,
        mouseindelay: 1000,
        data: {},
        duration: null
    },

    /*
     * coengine events listening
     */
    meetingsEvents: {
        "videotag.message.new"          :   "_handleNewComment",
        "internal.roster.update"        :   "_colorize",
        "videotag.message.vote"         :   "_handleVote",
        "videotag.message.delete"       :   "_handleDeleteComment",
        "videotag.message.owndelete"    :   "_handleDeleteOwnComment"
    },
    /*
     * UI initialize
     */
    _create: function() {
        window.mouseOverHistogramBar = 0;
        window.lastMouseOverHistogram = null;
        window.lastMouseOutHistogram = null;
        this._injectQueue = [];
        this._removeQueue = [];
        this._deferred = $.Deferred();
        var that = this;
        this._updateLoop = window.setInterval(function(){
            that._resolveDeferred();
        }, 2000);
        this.options.data = {};
        this._setTimers();
        this._setHovers();
        $(window).resize(function(){ that._setHovers(); });
    },
    _setTimers: function() {
        var duration = this.options.player.data('uceplayer').getDuration();
        var that = this;
        if(typeof duration !== "number" || duration <= 0) {
            window.setTimeout(function(){ that._setTimers(); }, 500);
            return;
        }
        this.options.duration = duration;
        var binsDuration = Math.ceil(duration / this.options.bins);
        this.element.find('span').each(function(i){
            if(typeof binsDuration !== "number") {
                return;
            }
            $(this).attr('data-timer', that._format(Math.round(binsDuration * i * 1000)));
            $(this).attr('data-currenttime', Math.round(binsDuration * i));
            $(this).on("mouseover", function() {
                    window.mouseOverHistogramBar = 1;
                    if (window.lastMouseOverHistogram!==null) {
                        window.clearTimeout(window.lastMouseOverHistogram);
                        window.lastMouseOverHistogram=null;
                    }
                    var jumpToBarTimer = _.throttle( function(ucemeeting, bar){
                        if(window.mouseOverHistogramBar === 0) {
                            return;
                        }
                        ucemeeting.trigger({
                            type:"internal.videotag.tickerpause",
                            id: Date.now().toString(),
                            metadata: { time: parseInt($(bar).attr('data-currenttime'), 10) }
                        });
                    }, 1000);
                    var bar = this;
                    window.lastMouseOverHistogram = window.setTimeout(jumpToBarTimer, that.options.mouseindelay, that.options.ucemeeting, bar);
                })
                .on("mouseout", function() {
                    window.mouseOverHistogramBar = 0;
                    if (window.lastMouseOutHistogram!==null) {
                        window.clearTimeout(window.lastMouseOutHistogram);
                        window.lastMouseOutHistogram=null;
                    }
                    window.lastMouseOutHistogram = window.setTimeout(function(){
                        if(window.mouseOverHistogramBar == 1) {
                            return;
                        }
                        if (window.lastMouseOverHistogram!==null) {
                            window.clearTimeout(window.lastMouseOverHistogram);
                            window.lastMouseOverHistogram=null;
                        }
                        that.options.ucemeeting.trigger({
                            type:"internal.videotag.tickerplay",
                            id: Date.now().toString()
                        });
                    }, that.options.mouseoutdelay);
                });
        });
    },
    _resolveDeferred: function() {
        if( this._deferred.state()==="pending") {
            this._deferred.resolve();
            return;
        }
        if(this._deferred.state()==="resolved" || this._deferred.state()==="rejected") {
            this._deferred = $.Deferred();
            return;
        }
    },
    _format: function(timestamp) {
        var neg = false;
        if (timestamp < 0) {
            timestamp *= -1;
            neg = true;
        }

        var date = new Date(timestamp);
        var hours = date.getHours() - 1;
        if (hours < 10) {
            hours = "0" + hours;
        }
        var minutes = date.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        var seconds = date.getSeconds();
        if (seconds < 10) {
            seconds = "0" + seconds;
        }

        var valueText = minutes + ":" + seconds;
        if(hours !== "00") {
            valueText = hours + ":" + minutes + ":" + seconds;
        }
        if (neg) {
            valueText = "-" + valueText;
        }

        return (valueText);
    },
    _setHovers: function(){
        var $videotickerFrame    = $('#videoticker-frame-comment'),
            $videotickerTimeline = this.element,
            videotickerTimelineP = $videotickerTimeline.offset(),
            $videotickerFrameTotal = $videotickerFrame.find('.videoticker-frame-comment-total'),
            $videotickerFrameTotalSpan = $videotickerFrame.find('.videoticker-frame-comment-total span'),
            $videotickerFrameTimer = $videotickerFrame.find('.videoticker-frame-comment-timer');

        this.element.find('span').hover(
            function()
            {
                var $this = $(this),
                    position = $this.offset(),
                    comments = $this.attr('data-comment'),
                    timer = $this.attr('data-timer');
                    
                if(parseInt(comments, 10) === 0)
                {
                    $videotickerFrameTotal.hide();    
                }
                    
                $videotickerFrameTotalSpan.text(comments);
                $videotickerFrameTimer.text(timer);
                
                $videotickerFrame.addClass('active').css('left', ((position.left - videotickerTimelineP.left) - 10));
            },
            function()
            {
                $videotickerFrameTotal.show();    
                $videotickerFrame.removeClass('active');
            }
        ); 
    },
    /*
     * Data structure
     */
    _addData: function(event) {
        if(this.options.data[event.id]===false) {
            delete this.options.data[event.id];
            return false;
        }
        this.options.data[event.id] = Math.round( event.metadata.currentTime );
    },
    _removeData: function(eventid) {
        if(this.options.data[eventid]===undefined) {
            this.options.data[eventid]=false;
            return false;
        }
        delete this.options.data[eventid];
    },
    _getCommentBar: function(event) {
        var time = null;
        if(event.metadata.parrent !== undefined) {
            time = this.options.data[event.metadata.parent];
        } else {
            time = this.options.data[event.id];
        }
        if(parseInt(time, 10)<=0){
            return this.element.find('span').first();
        }
        var duration = this.options.player.duration,
            binsDuration = Math.ceil(duration / this.options.bins);
        return this.element.find("span:eq("+(Math.ceil(parseInt(time, 10)/binsDuration) - 1)+")");
    },
    _incrementComment: function() {
        var event = this._injectQueue.pop();
        if(event===undefined) {
            return;
        }
        if(this._addData(event)===false) {
            return;
        }
        if(this.options.data[event.id]===undefined) {
            return;
        }
        var $span = this._getCommentBar(event);
        $span.attr("data-comment", parseInt($span.attr("data-comment"), 10)+1);
        this._colorize(event, $span);
    },
    _decrementComment: function() {
        var event = this._removeQueue.pop();
        if(event===undefined) {
            return;
        }
        if(this.options.data[event.metadata.parent]===undefined) {
            return;
        }
        var $span = this._getCommentBar(event);
        $span.attr("data-comment", parseInt($span.attr("data-comment"), 10)-1);
        this._colorize(event, $span);
        this._removeData(event.metadata.parent);
    },
    /*
     * sets the class and color
     */
    _colorize: function(event, span) {
        if(span===undefined) {
            span = this._getCommentBar(event);
        }
        if(span.attr("data-comment")==="0") {
            span.attr("class", "");
        } else {
            span.addClass(this.options.class_default);
        }
        var users = this.options.roster.getUsersState();
        if (_.isObject(users)!==true){
            return;
        }
        var user = users[event.from];
        if(_.isBoolean(user)===true || user === undefined) {
			return;
        }
        this._updateGroup(user, span);
    },
    _updateGroup: function(user, element) {
        if(user.metadata===undefined || user.metadata.groups===undefined) {
            return;
        }
        var groups = user.metadata.groups.split(",");
        // producteur OR personality
        if (_.include(this.options.speakers, user.uid)){
            element.removeClass(this.options.class_default);
            element.addClass(this.options.class_personality);
            return;
        }
        // user is me
        if (user.uid == this.options.uceclient.uid){
            element.removeClass(this.options.class_default);
            element.addClass(this.options.class_self);
            return;
        }
    },
    /*
     * UCE Event Callback
     * injects a message along the waveform
     */
    _handleNewComment: function(event) {
        if(this._deferred.state()==="resolved" || this._deferred.state()==="rejected") {
            this._deferred = $.Deferred();
        }
        this._injectQueue.push($.extend(true, {}, event));
        this._deferred.done(this._incrementComment());
        if(this.options.duration!==null){
            this._resolveDeferred();
            return;
        }
        if(this.options.player.data('uceplayer').getDuration() !== undefined && this.options.player.data('uceplayer').getDuration() > 0) {
            this.options.duration = this.options.player.data('uceplayer').getDuration();
            this._resolveDeferred();
        } 

    },
    /*
     * Update Votes Viz
     * TODO
     */
    _handleVote: function(event) {
    },
    /*
    * Delete a comment
    */
    _handleDeleteComment: function(event) {
        if(this._deferred.state()==="resolved" || this._deferred.state()==="rejected") {
            this._deferred = $.Deferred();
        }
        this._removeQueue.push($.extend(true, {}, event));
        this._deferred.done(this._decrementComment());
        if(this.options.duration!==null){
            this._resolveDeferred();
            return;
        }
        if(this.options.player.data('uceplayer').getDuration() !== undefined && this.options.player.data('uceplayer').getDuration() > 0) {
            this.options.duration = this.options.player.data('uceplayer').getDuration();
            this._resolveDeferred();
            return;
        }
    },
    /**
     * Delete the user's comment
    */
    _handleDeleteOwnComment: function(event) {
        this._handleDeleteComment(event);
    },
    destroy: function() {
        this.element.find('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    }
};
$.uce.widget("activitybar", new $.uce.ActivityBar());
