// this file is based on hoa_loader.js from JSAmbisonics
// adapted to be used with HOAST360
//
// Use HOASTloader to load one file of first-order binaural decoding filters
// and several files of higher-order filters.
// Filter lengths are allowed to differ from first to higher orders.
// Only use .wav files with HOASTloader, otherwise channel orders might get mixed up.
//
// Thomas Deppisch, 2020

////////////////////////////////////////////////////////////////////
//  Archontis Politis
//  archontis.politis@aalto.fi
//  David Poirier-Quinot
//  davipoir@ircam.fr
////////////////////////////////////////////////////////////////////
//
//  JSAmbisonics a JavaScript library for higher-order Ambisonics
//  The library implements Web Audio blocks that perform
//  typical ambisonic processing operations on audio signals.
//
////////////////////////////////////////////////////////////////////

export default class HOASTloader {
    constructor(context, order, url, callback) {
        this.context = context;
        this.order = order;
        this.nCh = (order + 1) * (order + 1);
        this.buffers = new Array();
        this.loadCount = 0;
        this.loaded = false;
        this.onLoad = callback;

        var fileExt = url.slice(url.length - 3, url.length);
        this.fileExt = fileExt;
        var fileBaseName = url.slice(0, url.length - 4);

        switch (this.order) {
            case 1:
                this.nChGroups = 1;
                this.urls = new Array(this.nChGroups);
                this.urls[0] = fileBaseName + "_01-04ch." + fileExt;
                break;
            case 2:
                this.nChGroups = 2;
                this.urls = new Array(this.nChGroups);
                this.urls[0] = fileBaseName + "_01-04ch." + fileExt;
                this.urls[1] = fileBaseName + "_05-09ch." + fileExt;
                break;
            case 3:
                this.nChGroups = 3;
                this.urls = new Array(this.nChGroups);
                this.urls[0] = fileBaseName + "_01-04ch." + fileExt;
                this.urls[1] = fileBaseName + "_05-12ch." + fileExt;
                this.urls[2] = fileBaseName + "_13-16ch." + fileExt;
                break;
            case 4:
                this.nChGroups = 4;
                this.urls = new Array(this.nChGroups);
                this.urls[0] = fileBaseName + "_01-04ch." + fileExt;
                this.urls[1] = fileBaseName + "_05-12ch." + fileExt;
                this.urls[2] = fileBaseName + "_13-20ch." + fileExt;
                this.urls[3] = fileBaseName + "_21-25ch." + fileExt;
                break;
        
            default:
                console.error('HOASTloader: unsupported Ambisonics order!')
                break;
        }
    }

    loadBuffers(url, index) {
        // Load buffer asynchronously
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        var scope = this;

        request.onload = function() {
            // Asynchronously decode the audio file data in request.response
            scope.context.decodeAudioData(
                request.response,
                function(buffer) {
                    if (!buffer) {
                        alert('error decoding file data: ' + url);
                        return;
                    }
                    scope.buffers[index] = buffer;
                    scope.loadCount++;
                    if (scope.loadCount == scope.nChGroups) {
                        scope.loaded = true;
                        scope.concatBuffers();
                        console.log("HOASTloader: all buffers loaded and concatenated")
                        scope.onLoad(scope.foaBuffer, scope.hoaBuffer);
                    }
                },
                function(error) {
                    alert("Browser cannot decode audio data:  " +  url + "\n\nError: " + error + "\n\n(If you re using Safari and get a null error, this is most likely due to Apple's shady plan going on to stop the .ogg format from easing web developer's life :)");
                }
            );
        }

        request.onerror = function() {
            alert('HOASTloader: XHR error');
        }

        request.send();
    }

    load() {
        for (var i = 0; i < this.nChGroups; ++i) this.loadBuffers(this.urls[i], i);
    }

    concatBuffers() {

        if (!this.loaded) return;

        var nCh = this.nCh;
        var nChGroups = this.nChGroups;

        this.foaBuffer = this.buffers[0];

        if (this.order === 1) return;

        var hoalength = 0;
        for (let i = 1; i < this.nChGroups; ++i)
            hoalength = Math.max(hoalength, this.buffers[i].length);

        var srate = this.buffers[1].sampleRate;

        this.hoaBuffer = this.context.createBuffer(nCh - 4, hoalength, srate);
        for (var i = 1; i < nChGroups; i++) {
            for (var j = 0; j < this.buffers[i].numberOfChannels; j++) {
                this.hoaBuffer.getChannelData((i - 1) * 8 + j).set(this.buffers[i].getChannelData(0));
            }
        }
    }
}
