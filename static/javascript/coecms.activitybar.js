/**
*  ActivityBar implements videotag activity timeline visualization
*  depends on :
*  * one UCE player widget
*  * the UCE videotag widget
*  * ucewidget.js
*  * underscore.js
*  * jquery UI
*
*  Copyright (C) 2011 CommOnEcoute,
*/

/*
 * Public MEthod sending the tiker an event
 * to scroll to a given second
 */
var jumpToCurrentBarTime = _.throttle( function(ucemeeting, bar){
    if(window.mouseOverHistogramBar === 0) {
        return;
    }
    ucemeeting.trigger({
        type:"internal.videotag.tickerpause",
        id: Date.now().toString(),
        metadata: { time: $(bar).attr('mintime') }
    });
}, 1000);

$.uce.ActivityBar = function(){};
$.uce.ActivityBar.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        player: null,
        baseHeight: 500,
        baseWidth: 300,
        bins: 20,
		color_default: d3.rgb(44, 45, 48),
		color_personality: d3.rgb(176, 15, 11),
		color_participant: d3.rgb(101, 40, 78),
		color_myPost: d3.rgb(33, 144, 121),
        opacity: 0.5,
        mouseoutdelay: 7000,
        mouseindelay: 1000,
        detachDelay: 4000,
        data: {}
    },

    /*
     * coengine events listening
     */
    meetingsEvents: {
        "videotag.message.postdispatch" :   "_injectMessage",
        //"internal.user.received"        :   "_colorUserPoints",
        "videotag.message.vote"         :   "_handleVoteMessage",
        "videotag.message.delete"       :   "_handleDeleteMessage",
        "videotag.message.owndelete"    :   "_handleDeleteOwnMessage"
    },
    /*
     * UI initialize
     */
    _create: function() {
		this.vis = d3.select("#"+this.element.attr('id'))
            .append("svg:svg")
            .attr("width", this.options.baseWidth)
            .attr("height", this.options.baseHeight)
            .attr('class', 'svg-container');
        window.mouseOverHistogramBar = 0;
        window.lastMouseOverHistogram = null;
        window.lastMouseOutHistogram = null;
		this.options.data = {};
        var svg = $('.svg-container').detach(),
            that = this;
        _.delay(function(){
            svg.appendTo(that.element);
        }, this.options.detachDelay);
    },
    /*
     * Data structure
     */
    _addData: function(event) {
        if(this.options.data[event.id]===false) {
            delete this.options.data[event.id];
            return false;
        }
        var currenttime = Math.round( event.metadata.currentTime );
        this.options.data[event.id] = currenttime;
    },
    _removeData: function(eventid) {
        if(this.options.data[eventid]===undefined) {
            this.options.data[eventid]=false;
            return false;
        }
        delete this.options.data[eventid];
    },
    /* 
     * SVG drawing
     */
    _updateHistogram: function(event) {
        var histogram = d3.layout.histogram().bins(this.options.bins)(_.values(this.options.data));

        var color = this.options.color_participant;
        var width = this.options.baseWidth;
        var height = this.options.baseHeight;
        var barHeight = Math.ceil(height/this.options.bins) - 2;

        var y = d3.scale.ordinal()
            .domain(histogram.map(function(d) { return d.x; }))
            .rangeRoundBands([0, height]);
        var x = d3.scale.linear()
            .domain([0, d3.max(histogram.map(function(d) { return d.y; }))])
            .range([0, width]);
        var that = this;
        var mouseindelay = this.options.mouseindelay;
        var mouseoutdelay = this.options.mouseoutdelay;

        var rect = this.vis.selectAll("rect").data(histogram);
        /* newly arrived bars */
        rect.enter()
            .append("svg:rect")
            .attr("height", barHeight)
            .attr("y", function(d) { return y(d.x); })
            .attr("x", 0)
            .attr("mintime", function(d,i) { return _.min(histogram[i]);})
            .attr("width", function(d) { return x(d.y); })
            .on("mouseover", function() {
                window.mouseOverHistogramBar = 1;
                if (window.lastMouseOverHistogram!==null) {
                    window.clearTimeout(window.lastMouseOverHistogram);
                    window.lastMouseOverHistogram=null;
                }
                var bar = this;
                window.lastMouseOverHistogram = window.setTimeout(jumpToCurrentBarTime, mouseindelay, that.options.ucemeeting, bar);
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
                }, mouseoutdelay);
            })
            .transition().duration(500)
                .attr("height", barHeight)
                .attr("y", function(d) { return y(d.x); })
                .attr("x", 0)
                .attr("mintime", function(d,i) { return _.min(histogram[i]);})
                .attr("width", function(d) { return x(d.y); })
                .attr("fill", color)
                .attr("fill-opacity", this.options.opacity);
        /* update existing bars */
        rect.transition().duration(500)
            .attr("height", barHeight)
            .attr("y", function(d) { return y(d.x); })
            .attr("x", 0)
            .attr("mintime", function(d,i) { return _.min(histogram[i]);})
            .attr("width", function(d) { return x(d.y); })
            .attr("fill", color)
            .attr("fill-opacity", this.options.opacity);
        /* removes vanished bars */
        rect.exit().remove();

        rect.on("mouseover", function() {
                window.mouseOverHistogramBar = 1;
                if (window.lastMouseOverHistogram!==null) {
                    window.clearTimeout(window.lastMouseOverHistogram);
                    window.lastMouseOverHistogram=null;
                }
                var bar = this;
                window.lastMouseOverHistogram = window.setTimeout(jumpToCurrentBarTime, mouseindelay, that.options.ucemeeting, bar);
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
                }, mouseoutdelay);
            });
    },
    /*
     * FIXME
     * sets the color of a bar
     */
    _colorize: function(event) {
        if(event.metadata.user===undefined || event.metadata.user.metadata.groups===undefined) {
            event.color = this.options.color_participant;
            return;
        }
        var user = event.metadata.user;
        var groups = event.metadata.user.metadata.groups.split(",");
		// user is me
        if (user.uid == this.options.uceclient.uid){
			event.color = this.options.color_myPost;
            return;
        }
        // producteur OR personality
        if (_.include(groups, 'producteur') || _.include(groups, 'personnalite')){
            event.color = this.options.color_personality;
            return;
        }
        // participant
        event.color = this.options.color_participant;
    },
    /*
     * UCE Event Callback
     * injects a message along the waveform
     */
    _injectMessage: function(event) {
        if(this._addData(event)!==false) {
            // TODO this._colorize(event);
            this._updateHistogram(event);
            return;
        }
    },

    /*
     * Update Votes Viz
     * TODO
     */
    _handleVoteMessage: function(event) {
    },
    /*
    * Delete a Point
    */
    _handleDeleteMessage: function(event) {
        if(this._removeData(event.metadata.parent)!==false) {
            this._updateHistogram(event);
        }
    },
    /**
     * Delete a Point
    */
    _handleDeleteOwnMessage: function(event) {
        this._handleDeleteMessage(event);
    },
    destroy: function() {
        this.element.find('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    }
};
$.uce.widget("activitybar", new $.uce.ActivityBar());
