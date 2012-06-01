/**
*  Waveform implements video message positionning, transforming, and sync scrolling
*  depends :
*  * ucewidgets.js
*  * uceplayer coengine widget
*  * underscore.js
*  * jqueryUI
*
*  Copyright (C) 2011 CommOnEcoute,
*  maintained by Elias Showk <elias.showk@gmail.com>
*/

$.uce.Waveform = function(){};
$.uce.Waveform.prototype = {
    options: {
        ucemeeting: null,
        uceclient: null,
        player: null,
        baseHeight: 300,
        default_interval: 1000,
        isLive: false,
        playheadContainer: $('.ui-videotag-arrowhead').parent(),
        playhead: $('.ui-videotag-arrowhead')
    },

    /*
     * ucengine events listening
     */
    meetingsEvents: {
    },
    /*
     * UI initialize
     * Positionning the waveform or ruler
     * Sets the containers height
     */
    _create: function() {
        this.container = $('.ui-videotag-container', this.element);
        // TODO supprimer, bouger vers CSS
        this.container.css("max-height", this.options.baseHeight);
        this._insertwaveform();
        
        var that = this;
        this._tickerLoop = window.setInterval(function(){that._ticker();}, this.options.default_interval);
    },
    /*
     * Redimensions the widget's height
     * sets waveform height and SVG viz height
     */
    setHeight: function(new_height) {
		if (this.waveform!==null){
			this.waveform.height(new_height);
		}
    },

    /*
     * moves the IMG to be a ruler or a waveform
     */
    _getwaveformSrc: function() {
        var src = $("img", this.element).attr("src");
        $("img", this.element).remove();
        return src;
    },

    /*
    * waveform injection to DOM
    */
    _insertwaveform: function() {
        var waveform = null;
        if (this.options.isLive === false) {
            var src = this._getwaveformSrc();
            if(src) {
                waveform = $('<img>').attr({'src': src});
            } else {
                waveform = $('<div>').addClass('ui-videotag-ruler');
            }
            waveform.height(this.options.baseHeight);
        } else {
			waveform = $('<div>').addClass('ui-videotag-ruler');
            waveform.height(this.options.baseHeight);
        }
		waveform.addClass('ui-videotag-waveformimg');
		waveform.appendTo(this.element);
        this.waveform = waveform;
    },
    /*
     * Scrolls the Play Head to the current video playback position
     */
    _ticker: function(){
        var currentTime = this.options.player.uceplayer('getCurrentTime');
        var duration = this.options.player.uceplayer('getDuration');
        var percent = 0;
        if (currentTime > 0 && duration > 0) {
            percent = (currentTime/duration)*100;
        }
        this.options.playheadContainer.css({
            "top": this.options.baseHeight*(percent/100)
        });
    },

    destroy: function() {
        window.clearInterval(this._tickerLoop);
        this.element.find('*').remove();
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
    },
    
    resizeWaveform: function(h) {
        if (this.options.baseHeight != h){
            this.options.baseHeight = h;
            this.setHeight(this.options.baseHeight);
        }
    }

};
$.uce.widget("waveform", new $.uce.Waveform());
